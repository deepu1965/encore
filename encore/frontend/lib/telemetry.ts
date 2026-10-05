import { env } from './env';

/**
 * Telemetry wrapper (Sentry placeholder). Architecturally this is the ONE
 * place instrumentation lives — called from apiClient's interceptors and
 * WebSocketManager's lifecycle hooks, never scattered per-component
 * (frontend-architecture.md §5). The real Sentry SDK wiring lands in the
 * observability phase; these are no-op-safe stubs so callers can be written
 * to the final interface now.
 */

export interface TelemetryContext {
  requestId?: string;
  [key: string]: unknown;
}

function enabled(): boolean {
  return Boolean(env.NEXT_PUBLIC_SENTRY_DSN);
}

export const telemetry = {
  captureError(error: unknown, context?: TelemetryContext): void {
    if (!enabled()) {
      // Dev/no-DSN: surface to console so nothing is silently swallowed.
      if (env.NEXT_PUBLIC_ENVIRONMENT !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[telemetry] error', error, context ?? {});
      }
      return;
    }
    // TODO(observability phase): Sentry.captureException(error, { extra: context })
  },

  captureMessage(message: string, context?: TelemetryContext): void {
    if (!enabled()) {
      if (env.NEXT_PUBLIC_ENVIRONMENT !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[telemetry]', message, context ?? {});
      }
      return;
    }
    // TODO(observability phase): Sentry.captureMessage(message, { extra: context })
  },

  /** Record a latency/measurement sample (API call, WS lifecycle). */
  recordTiming(_name: string, _durationMs: number, _context?: TelemetryContext): void {
    // TODO(observability phase): forward to metrics backend.
  },
};
