import { env } from '@/lib/env';

/**
 * Static per-environment feature flags. Used for exactly two purposes
 * (frontend-architecture.md §4):
 *  1. gating P2/P3 features by priority tier
 *  2. gating backend-gap-blocked surfaces so they render an explicit
 *     "not yet available" state instead of a broken page.
 *
 * Gap-driven flags below map to Phase 0's confirmed gaps (G-1..G-17).
 * Default OFF wherever the backend cannot support the surface yet.
 */
export interface FeatureFlags {
  // Documented gaps (G-1..G-7)
  artistPages: boolean; // G-1
  opsIncidents: boolean; // G-2
  mediaAccessGating: boolean; // G-4 (built assuming TICKET_HOLDERS_ONLY)
  organizerReserveSeats: boolean; // G-5
  ticketTransfer: boolean; // G-6
  supportRole: boolean; // G-7

  // Phase 0 additional gaps
  authSignup: boolean; // G-8 — no backend signup endpoint
  authPasswordReset: boolean; // G-8 — no backend reset endpoints
  resaleReads: boolean; // G-12 — no GET listings/order-book/trades
  walletLedger: boolean; // G-14 — wallet is a stub, no ledger
  notifications: boolean; // G-15 — no notification HTTP endpoints
}

const base: FeatureFlags = {
  artistPages: false,
  opsIncidents: false,
  mediaAccessGating: true,
  organizerReserveSeats: false,
  ticketTransfer: false,
  supportRole: false,
  authSignup: false,
  authPasswordReset: false,
  resaleReads: false,
  walletLedger: false,
  notifications: false,
};

const overrides: Partial<Record<typeof env.NEXT_PUBLIC_ENVIRONMENT, Partial<FeatureFlags>>> = {
  development: {
    // In dev we may want to preview gapped surfaces against stubs; keep
    // them OFF by default here too so behavior matches staging/prod.
  },
};

export const featureFlags: FeatureFlags = {
  ...base,
  ...(overrides[env.NEXT_PUBLIC_ENVIRONMENT] ?? {}),
};

export function isEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}
