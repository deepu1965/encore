import { serviceBaseUrl, type ServiceName } from './env';
import { telemetry } from './telemetry';
import { isPublicRoute } from '@/config/route-permissions';

/**
 * Typed HTTP client for the Encore V1 backend.
 *
 * Responsibilities (Phase 1, per api-contracts.md + state-management.md):
 *  - unwrap the `{ data | error, request_id }` response envelope
 *  - convert snake_case response bodies to camelCase (one place only)
 *  - attach Idempotency-Key + X-Request-Id headers
 *  - detect X-Maintenance-Mode / X-Service-Degraded response headers
 *  - classify errors (400/401/403/404/409/429/5xx/timeout/network)
 *  - apply the retry table (GETs retried; holds/orders/payments/buy NOT)
 *  - support request cancellation (AbortSignal)
 *  - route to a per-service origin (gap G-9) via the `service` option
 *
 * The httpOnly auth cookie is attached automatically by the browser
 * (credentials: 'include'); this client never touches the token itself.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  requestId: string;
}

export type ApiErrorKind =
  | 'validation' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not_found' // 404
  | 'conflict' // 409
  | 'rate_limited' // 429
  | 'server' // 5xx
  | 'timeout'
  | 'network'
  | 'maintenance'
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(params: {
    kind: ApiErrorKind;
    status: number | null;
    code: string | null;
    message: string;
    requestId?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.kind = params.kind;
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId ?? null;
    this.retryAfterSeconds = params.retryAfterSeconds ?? null;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON-serializable request body. */
  body?: unknown;
  /** Query params; undefined/null values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Frontend-controlled idempotency key for mutating requests. */
  idempotencyKey?: string;
  /** Per-service origin (gap G-9). Defaults to the gateway. */
  service?: ServiceName;
  /** Caller-supplied cancellation signal. */
  signal?: AbortSignal;
  /** Override the per-request timeout (ms). Payments use 30s. */
  timeoutMs?: number;
  /** Force-disable auto-retry regardless of the default for this method. */
  noRetry?: boolean;
  /** Extra headers. */
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Case conversion
// ---------------------------------------------------------------------------

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively convert object keys from snake_case to camelCase. */
export function camelizeKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelizeKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[toCamel(k)] = camelizeKeys(v);
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Maintenance / degraded observers
// ---------------------------------------------------------------------------

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
    return () => this.listeners.delete(l);
  }
}

/** Set true when any response carries `X-Maintenance-Mode: true`. */
export const maintenanceMode = new Observable<boolean>(false);
/** Set to the degraded service name from `X-Service-Degraded`, or null. */
export const degradedService = new Observable<string | null>(null);

// ---------------------------------------------------------------------------
// Retry policy (state-management.md §"Retry rules by request type")
// ---------------------------------------------------------------------------

const NON_RETRYABLE_PATHS = [
  '/holds', // POST /holds must not silently succeed on stale intent
  '/orders', // POST /orders — same
  '/payments', // payment retry is user-initiated, reuses same key
  '/resale/orders', // buy-order race must not auto-retry into a second bid
];

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_GET_ATTEMPTS = 3;
const DEFAULT_OTHER_ATTEMPTS = 2;
const BACKOFF_MS = [500, 1000, 2000];

function retryAttemptsFor(method: string, path: string, noRetry?: boolean): number {
  if (noRetry) return 1;
  if (method === 'GET') return DEFAULT_GET_ATTEMPTS;
  if (NON_RETRYABLE_PATHS.some((p) => path.startsWith(p))) return 1;
  if (method === 'PATCH' || method === 'DELETE' || method === 'PUT') {
    return DEFAULT_OTHER_ATTEMPTS;
  }
  // POSTs not on the non-retryable list are treated as non-retryable by
  // default — safer than assuming idempotency.
  return 1;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

function generateRequestId(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(16).slice(2);
  return `req_${rand}`;
}

function buildUrl(
  base: string,
  path: string,
  query?: RequestOptions['query'],
): string {
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function classifyStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    default:
      return status >= 500 ? 'server' : 'unknown';
  }
}

function readEnvelopeHeaders(res: Response): void {
  const maint = res.headers.get('X-Maintenance-Mode');
  maintenanceMode.set(maint === 'true');
  const degraded = res.headers.get('X-Service-Degraded');
  degradedService.set(degraded && degraded.length > 0 ? degraded : null);
}

// ---------------------------------------------------------------------------
// Token refresh (Phase 3)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  // Coalesce concurrent refresh attempts
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        throw new ApiError({
          kind: 'unauthorized',
          status: res.status,
          code: 'REFRESH_FAILED',
          message: 'Session refresh failed',
        });
      }
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function doFetch<T>(
  path: string,
  options: RequestOptions,
): Promise<ApiSuccess<T>> {
  const method = options.method ?? 'GET';
  const base = serviceBaseUrl(options.service ?? 'gateway');
  const url = buildUrl(base, path, options.query);
  const requestId = generateRequestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers: Record<string, string> = {
    'X-Request-Id': requestId,
    Accept: 'application/json',
    ...options.headers,
  };
  if (typeof document !== 'undefined') {
    const mockCookie = document.cookie.split('; ').find(row => row.startsWith('mock_role='));
    if (mockCookie) {
      const val = mockCookie.split('=')[1];
      if (val) {
        headers['x-mock-role'] = decodeURIComponent(val);
      }
    }
  }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  // Compose a timeout signal with any caller-supplied signal.
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), timeoutMs);
  const signals = [timeoutController.signal];
  if (options.signal) signals.push(options.signal);
  const signal = anySignal(signals);

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'include', // send httpOnly auth cookie
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (timeoutController.signal.aborted) {
      throw new ApiError({
        kind: 'timeout',
        status: null,
        code: 'TIMEOUT',
        message: `Request timed out after ${timeoutMs}ms`,
        requestId,
      });
    }
    // Caller-cancelled: re-throw the DOMException so callers can ignore it.
    if (options.signal?.aborted) throw err;
    throw new ApiError({
      kind: 'network',
      status: null,
      code: 'NETWORK',
      message: err instanceof Error ? err.message : 'Network error',
      requestId,
    });
  } finally {
    clearTimeout(timer);
  }

  telemetry.recordTiming(`api.${method}`, Date.now() - started, { requestId });
  readEnvelopeHeaders(res);

  if (res.headers.get('X-Maintenance-Mode') === 'true') {
    throw new ApiError({
      kind: 'maintenance',
      status: res.status,
      code: 'MAINTENANCE_MODE',
      message: 'The platform is in maintenance mode.',
      requestId,
    });
  }

  const raw = await safeJson(res);
  const camel = camelizeKeys(raw) as
    | { data?: unknown; error?: { code?: string; message?: string }; requestId?: string }
    | undefined;
  const bodyRequestId = camel?.requestId ?? requestId;

  if (!res.ok) {
    const kind = classifyStatus(res.status);
    
    // Handle 401 with token refresh (Phase 3)
    if (kind === 'unauthorized' && !options.noRetry) {
      try {
        await refreshSession();
        // Retry the original request once after successful refresh
        return await doFetch<T>(path, { ...options, noRetry: true });
      } catch {
        // Refresh failed — redirect to login if not in mock_role session and not on a public route
        if (typeof window !== 'undefined' && !document.cookie.includes('mock_role=') && !isPublicRoute(window.location.pathname)) {
          const loginUrl = new URL('/login', window.location.origin);
          loginUrl.searchParams.set('redirect', window.location.pathname);
          window.location.href = loginUrl.toString();
        }
        // For SSR or mock mode, just let error propagate
      }
    }
    
    const retryAfter = res.headers.get('Retry-After');
    const apiError = new ApiError({
      kind,
      status: res.status,
      code: camel?.error?.code ?? null,
      message: camel?.error?.message ?? `Request failed with status ${res.status}`,
      requestId: bodyRequestId,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : null,
    });
    if (kind === 'server') telemetry.captureError(apiError, { requestId: bodyRequestId });
    throw apiError;
  }

  // Success envelope: prefer `data`, but tolerate services that don't wrap
  // (resale-engine/wallet return bare objects — Phase 0 G-12/G-14).
  const data = (camel && 'data' in camel ? camel.data : camel) as T;
  return { data, requestId: bodyRequestId };
}

// ---------------------------------------------------------------------------
// Public request with retry
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const method = options.method ?? 'GET';
  const attempts = retryAttemptsFor(method, path, options.noRetry);
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await doFetch<T>(path, options);
    } catch (err) {
      lastError = err;
      const retryable =
        err instanceof ApiError && (err.kind === 'server' || err.kind === 'timeout' || err.kind === 'network');
      const hasNext = attempt < attempts - 1;
      if (!retryable || !hasNext) throw err;
      await delay(BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 2000);
    }
  }
  throw lastError;
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return { error: { code: 'INVALID_JSON', message: text.slice(0, 500) } };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Merge multiple AbortSignals into one (Node 20 lacks AbortSignal.any in all runtimes). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 1) return signals[0] as AbortSignal;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}
