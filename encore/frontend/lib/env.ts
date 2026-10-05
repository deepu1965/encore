import { z } from 'zod';

/**
 * Environment configuration, validated against a Zod schema.
 *
 * Multi-service topology (Phase 0 gap G-9): the V1 api-gateway does NOT
 * proxy the resale, waiting-room, wallet, and notification services —
 * they run as separate FastAPI apps on their own origins. Rather than
 * assume a single origin, we expose an optional per-service base URL for
 * each. When unset, `serviceBaseUrl()` falls back to the gateway origin,
 * so a future gateway-proxy (the preferred G-9 resolution) needs only the
 * env vars removed, not code changes.
 *
 * Nothing genuinely secret ever lives in a NEXT_PUBLIC_* variable
 * (security.md §7). These are all public origins.
 */
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v ? v : undefined));

const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : 'http://localhost:8000')),
  NEXT_PUBLIC_WS_BASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : 'ws://localhost:8000/ws')),
  NEXT_PUBLIC_MAPTILE_URL: optionalUrl,
  NEXT_PUBLIC_ENVIRONMENT: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  NEXT_PUBLIC_SENTRY_DSN: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),

  // Per-service origins (G-9). Optional — fall back to the gateway.
  NEXT_PUBLIC_RESALE_BASE_URL: optionalUrl,
  NEXT_PUBLIC_WAITING_ROOM_BASE_URL: optionalUrl,
  NEXT_PUBLIC_WALLET_BASE_URL: optionalUrl,
  NEXT_PUBLIC_NOTIFICATION_BASE_URL: optionalUrl,
});

// Next.js inlines NEXT_PUBLIC_* at build time only via direct property
// access, so we cannot iterate process.env — reference each explicitly.
const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_WS_BASE_URL: process.env.NEXT_PUBLIC_WS_BASE_URL,
  NEXT_PUBLIC_MAPTILE_URL: process.env.NEXT_PUBLIC_MAPTILE_URL,
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_RESALE_BASE_URL: process.env.NEXT_PUBLIC_RESALE_BASE_URL,
  NEXT_PUBLIC_WAITING_ROOM_BASE_URL: process.env.NEXT_PUBLIC_WAITING_ROOM_BASE_URL,
  NEXT_PUBLIC_WALLET_BASE_URL: process.env.NEXT_PUBLIC_WALLET_BASE_URL,
  NEXT_PUBLIC_NOTIFICATION_BASE_URL: process.env.NEXT_PUBLIC_NOTIFICATION_BASE_URL,
});

if (!parsed.success) {
  // Fail fast at build/startup rather than surfacing a broken app at runtime.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;

/** Domains whose endpoints live on a separate service origin (gap G-9). */
export type ServiceName = 'gateway' | 'resale' | 'waitingRoom' | 'wallet' | 'notification';

/**
 * Resolve the base URL for a given service. Falls back to the gateway
 * origin when a service-specific URL is not configured (single-origin /
 * gateway-proxy deployments).
 */
export function serviceBaseUrl(service: ServiceName = 'gateway'): string {
  switch (service) {
    case 'resale':
      return env.NEXT_PUBLIC_RESALE_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL;
    case 'waitingRoom':
      return env.NEXT_PUBLIC_WAITING_ROOM_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL;
    case 'wallet':
      return env.NEXT_PUBLIC_WALLET_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL;
    case 'notification':
      return env.NEXT_PUBLIC_NOTIFICATION_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL;
    case 'gateway':
    default:
      return env.NEXT_PUBLIC_API_BASE_URL;
  }
}

export const isProduction = env.NEXT_PUBLIC_ENVIRONMENT === 'production';
