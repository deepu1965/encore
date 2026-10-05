import { telemetry } from './telemetry';

/**
 * WebSocketManager — the single per-tab realtime connection.
 *
 * Design per architecture/realtime-architecture.md: one physical socket,
 * ref-counted channel multiplexing, envelope-based routing, dedup ring
 * buffer, backoff reconnect, heartbeat. Instantiated once in the root
 * layout's client provider tree.
 *
 * Phase 0 gap G-10 (IMPORTANT): today only the V1 chat WS exists, and it
 * uses a FLAT message shape (`{type, id, event_id, ...}`), not the
 * envelope below, and integer-id backfill rather than `after_sequence`.
 * This skeleton implements the PROPOSED envelope contract (to be confirmed
 * with the backend); the chat feature client (Phase 10) and any Kafka→WS
 * bridge will adapt real backend frames into this shape at the edge. Until
 * a bridge exists for non-chat channels, those features rely on the
 * polling fallback (§7).
 */

// ---------------------------------------------------------------------------
// Envelope + status
// ---------------------------------------------------------------------------

export interface WsEnvelope<P = unknown> {
  messageType: string;
  channel: string;
  sequence: number;
  correlationId: string | null;
  occurredAt: string;
  payload: P;
}

export type TransportType = 'websocket' | 'sse' | 'polling';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected' | 'fallback_sse' | 'fallback_polling';

export type MessageHandler<P = unknown> = (envelope: WsEnvelope<P>) => void;

type Listener<T> = (value: T) => void;

class Observable<T> {
  private value: T;
  private listeners = new Set<Listener<T>>();
  constructor(initial: T) {
    this.value = initial;
  }
  get(): T {
    return this.value;
  }
  set(next: T): void {
    if (next === this.value) return;
    this.value = next;
    for (const l of this.listeners) l(next);
  }
  subscribe(l: Listener<T>): () => void {
    this.listeners.add(l);
    l(this.value);
    return () => this.listeners.delete(l);
  }
}

// ---------------------------------------------------------------------------
// Deduplication — 200-sequence ring buffer per channel
// ---------------------------------------------------------------------------

class MessageDeduplicator {
  private readonly windowSize = 200;
  private seen = new Map<string, Set<number>>();
  private order = new Map<string, number[]>();

  /** Returns true if this (channel, sequence) is a duplicate. */
  isDuplicate(channel: string, sequence: number): boolean {
    let set = this.seen.get(channel);
    let queue = this.order.get(channel);
    if (!set) {
      set = new Set();
      queue = [];
      this.seen.set(channel, set);
      this.order.set(channel, queue);
    }
    if (set.has(sequence)) return true;
    set.add(sequence);
    queue!.push(sequence);
    if (queue!.length > this.windowSize) {
      const evicted = queue!.shift();
      if (evicted !== undefined) set.delete(evicted);
    }
    return false;
  }

  reset(channel?: string): void {
    if (channel) {
      this.seen.delete(channel);
      this.order.delete(channel);
    } else {
      this.seen.clear();
      this.order.clear();
    }
  }
}

// ---------------------------------------------------------------------------
// EventRouter — dispatch by message type, scoped to a channel
// ---------------------------------------------------------------------------

class EventRouter {
  // channel -> messageType -> set of handlers
  private routes = new Map<string, Map<string, Set<MessageHandler>>>();

  register(channel: string, messageType: string, handler: MessageHandler): () => void {
    let byType = this.routes.get(channel);
    if (!byType) {
      byType = new Map();
      this.routes.set(channel, byType);
    }
    let handlers = byType.get(messageType);
    if (!handlers) {
      handlers = new Set();
      byType.set(messageType, handlers);
    }
    handlers.add(handler);
    return () => handlers!.delete(handler);
  }

  dispatch(envelope: WsEnvelope): void {
    const byType = this.routes.get(envelope.channel);
    if (!byType) return;
    const handlers = byType.get(envelope.messageType);
    if (!handlers) return;
    for (const h of handlers) {
      try {
        h(envelope);
      } catch (err) {
        telemetry.captureError(err, { requestId: envelope.correlationId ?? undefined });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// ReconnectStrategy — exponential backoff + jitter
// ---------------------------------------------------------------------------

class ReconnectStrategy {
  private readonly steps = [1000, 2000, 4000, 8000];
  private attempt = 0;

  nextDelay(): number {
    const base = this.steps[Math.min(this.attempt, this.steps.length - 1)] ?? 8000;
    this.attempt += 1;
    const jitter = base * 0.2 * (Math.random() * 2 - 1); // ±20%
    return Math.round(base + jitter);
  }

  get currentAttempt(): number {
    return this.attempt;
  }

  reset(): void {
    this.attempt = 0;
  }
}

// ---------------------------------------------------------------------------
// Heartbeat — 25s ping, 5s pong timeout
// ---------------------------------------------------------------------------

class Heartbeat {
  private readonly pingIntervalMs = 25_000;
  private readonly pongTimeoutMs = 5_000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sendPing: () => void,
    private readonly onDead: () => void,
  ) {}

  start(): void {
    this.stop();
    this.pingTimer = setInterval(() => {
      this.sendPing();
      this.pongTimer = setTimeout(() => this.onDead(), this.pongTimeoutMs);
    }, this.pingIntervalMs);
  }

  onPong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  stop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.pongTimer) clearTimeout(this.pongTimer);
    this.pingTimer = null;
    this.pongTimer = null;
  }
}

// ---------------------------------------------------------------------------
// SubscriptionManager — ref-counted channel subscriptions
// ---------------------------------------------------------------------------

class SubscriptionManager {
  private refCounts = new Map<string, number>();

  /** Returns true if this was the first subscriber (needs a wire subscribe). */
  add(channel: string): boolean {
    const count = this.refCounts.get(channel) ?? 0;
    this.refCounts.set(channel, count + 1);
    return count === 0;
  }

  /** Returns true if this was the last subscriber (needs a wire unsubscribe). */
  remove(channel: string): boolean {
    const count = this.refCounts.get(channel) ?? 0;
    if (count <= 1) {
      this.refCounts.delete(channel);
      return count === 1;
    }
    this.refCounts.set(channel, count - 1);
    return false;
  }

  activeChannels(): string[] {
    return [...this.refCounts.keys()];
  }
}

// ---------------------------------------------------------------------------
// ConnectionManager — owns the single WebSocket
// ---------------------------------------------------------------------------

class ConnectionManager {
  readonly status = new Observable<ConnectionStatus>('disconnected');
  readonly transport = new Observable<TransportType>('websocket');
  private socket: WebSocket | null = null;
  private sseSource: EventSource | null = null;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private url: string | null = null;
  private manualClose = false;
  private consecutiveFailures = 0;

  constructor(
    private readonly onMessage: (data: unknown) => void,
    private readonly onOpen: () => void,
    private readonly reconnect: ReconnectStrategy,
  ) {}

  connect(url: string): void {
    this.url = url;
    this.manualClose = false;
    this.open();
  }

  private open(): void {
    if (!this.url) return;
    
    if (this.consecutiveFailures >= 6) {
       this.startPolling();
       return;
    } else if (this.consecutiveFailures >= 3) {
       this.startSSE();
       return;
    }
    
    this.startWebSocket();
  }

  private startWebSocket(): void {
    if (typeof WebSocket === 'undefined') {
       this.consecutiveFailures = 3;
       this.open();
       return;
    }
    this.transport.set('websocket');
    this.status.set(this.socket ? 'reconnecting' : 'disconnected');
    try {
      this.socket = new WebSocket(this.url!);
    } catch (err) {
      telemetry.captureError(err);
      this.consecutiveFailures++;
      this.scheduleReconnect();
      return;
    }
    this.socket.onopen = () => {
      this.reconnect.reset();
      this.consecutiveFailures = 0;
      this.status.set('connected');
      this.onOpen();
    };
    this.socket.onmessage = (ev) => {
      try {
        this.onMessage(JSON.parse(ev.data as string));
      } catch (err) {
        telemetry.captureError(err);
      }
    };
    this.socket.onclose = (ev) => {
      if (ev.code === 4001 || ev.code === 4003) {
         // Auth failure, do not reconnect
         this.disconnect();
         return;
      }
      if (!this.manualClose) {
         this.consecutiveFailures++;
         this.scheduleReconnect();
      }
    };
    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private startSSE(): void {
     if (typeof EventSource === 'undefined') {
        this.consecutiveFailures = 6;
        this.open();
        return;
     }
     this.transport.set('sse');
     this.status.set('fallback_sse');
     try {
        const sseUrl = this.url!.replace('ws://', 'http://').replace('wss://', 'https://') + '/sse';
        this.sseSource = new EventSource(sseUrl);
     } catch (err) {
        this.consecutiveFailures++;
        this.scheduleReconnect();
        return;
     }
     
     this.sseSource.onopen = () => {
        this.reconnect.reset();
        this.onOpen();
     };
     this.sseSource.onmessage = (ev) => {
        try {
          this.onMessage(JSON.parse(ev.data));
        } catch (err) {
          telemetry.captureError(err);
        }
     };
     this.sseSource.onerror = () => {
        this.sseSource?.close();
        if (!this.manualClose) {
           this.consecutiveFailures++;
           this.scheduleReconnect();
        }
     };
  }

  private startPolling(): void {
     this.transport.set('polling');
     this.status.set('fallback_polling');
     this.reconnect.reset();
     this.onOpen(); // Trigger resubscriptions via HTTP POST fallback

     if (this.pollingTimer) clearInterval(this.pollingTimer);
     this.pollingTimer = setInterval(() => {
        // Mock polling logic - in reality would POST to a /sync endpoint with active channels
        // and fetch missed events since last sequence per channel.
     }, 10000);
  }

  private scheduleReconnect(): void {
    if (this.consecutiveFailures < 3) {
      this.status.set('reconnecting');
    }
    const delayMs = this.reconnect.nextDelay();
    setTimeout(() => {
      if (!this.manualClose) this.open();
    }, delayMs);
  }

  send(data: unknown): void {
    if (this.transport.get() === 'websocket' && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else if (this.transport.get() === 'sse' || this.transport.get() === 'polling') {
      // Mock HTTP POST fallback for sending messages when WS is unavailable
      // fetch('/api/v1/realtime/send', { method: 'POST', body: JSON.stringify(data) });
    }
  }

  disconnect(): void {
    this.manualClose = true;
    this.socket?.close();
    this.sseSource?.close();
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    
    this.socket = null;
    this.sseSource = null;
    this.pollingTimer = null;
    
    this.status.set('disconnected');
  }
}

// ---------------------------------------------------------------------------
// WebSocketManager — public facade
// ---------------------------------------------------------------------------

export class WebSocketManager {
  private readonly reconnect = new ReconnectStrategy();
  private readonly dedup = new MessageDeduplicator();
  private readonly router = new EventRouter();
  private readonly subscriptions = new SubscriptionManager();
  private readonly connection: ConnectionManager;
  private readonly heartbeat: Heartbeat;

  constructor() {
    this.connection = new ConnectionManager(
      (data) => this.handleFrame(data),
      () => this.onConnected(),
      this.reconnect,
    );
    this.heartbeat = new Heartbeat(
      () => this.connection.send({ messageType: 'ping' }),
      () => {
        // Ping timeout triggers reconnect
        this.connection.disconnect();
        this.connection.connect(wsBaseUrl!); // Resets connection with previous URL
      }
    );

    // Network transition & Tab suspension handlers
    if (typeof window !== 'undefined') {
       window.addEventListener('online', () => {
          if (this.status.get() !== 'connected') {
             this.connection.connect(wsBaseUrl!);
          }
       });
       document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && this.status.get() !== 'connected') {
             this.connection.connect(wsBaseUrl!);
          }
       });
    }
    
    let wsBaseUrl: string | null = null;
  }

  get status() {
    return this.connection.status;
  }

  get transport() {
    return this.connection.transport;
  }

  connect(url: string): void {
    this.connection.connect(url);
  }

  disconnect(): void {
    this.heartbeat.stop();
    this.connection.disconnect();
  }

  /**
   * Subscribe a handler to (channel, messageType). Returns an unsubscribe
   * function. The first subscriber to a channel sends a wire `subscribe`;
   * the last to leave sends `unsubscribe`.
   */
  subscribe<P = unknown>(
    channel: string,
    messageType: string,
    handler: MessageHandler<P>,
  ): () => void {
    const unregister = this.router.register(channel, messageType, handler as MessageHandler);
    if (this.subscriptions.add(channel)) {
      this.connection.send({ messageType: 'subscribe', channel });
    }
    return () => {
      unregister();
      if (this.subscriptions.remove(channel)) {
        this.connection.send({ messageType: 'unsubscribe', channel });
        this.dedup.reset(channel);
      }
    };
  }

  private onConnected(): void {
    this.heartbeat.start();
    // Re-subscribe every active channel in order (reconnect recovery).
    for (const channel of this.subscriptions.activeChannels()) {
      this.connection.send({ messageType: 'subscribe', channel });
    }
  }

  private handleFrame(data: unknown): void {
    const frame = data as Partial<WsEnvelope> & { messageType?: string };
    if (frame.messageType === 'pong') {
      this.heartbeat.onPong();
      return;
    }
    if (
      !frame.channel ||
      typeof frame.sequence !== 'number' ||
      typeof frame.messageType !== 'string'
    ) {
      return; // malformed / non-envelope frame — ignored at the manager layer
    }
    if (this.dedup.isDuplicate(frame.channel, frame.sequence)) return;
    this.router.dispatch(frame as WsEnvelope);
  }
}

/** Lazily-created per-tab singleton. */
let singleton: WebSocketManager | null = null;
export function getWebSocketManager(): WebSocketManager {
  if (!singleton) singleton = new WebSocketManager();
  return singleton;
}
