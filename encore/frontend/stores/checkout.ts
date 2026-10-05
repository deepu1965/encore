import { create } from 'zustand';

/**
 * Ephemeral checkout-session UI state. Holds the current session's
 * Idempotency-Key (generated once, reused on every retry — the whole point
 * of the RETRYING payment state) and the current step.
 *
 * NEVER holds payment data (card details, etc.) — nothing payment-related
 * is ever persisted client-side (security.md §4).
 */
export type CheckoutStep = 'review' | 'payment' | 'processing' | 'confirmation' | 'unknown';

interface CheckoutState {
  idempotencyKey: string | null;
  step: CheckoutStep;
  orderId: string | null;
  /** Create the session key once; subsequent calls are no-ops. */
  ensureIdempotencyKey: () => string;
  setStep: (step: CheckoutStep) => void;
  setOrderId: (orderId: string) => void;
  reset: () => void;
}

function newKey(): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(16).slice(2);
  return `pay_${rand}`;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  idempotencyKey: null,
  step: 'review',
  orderId: null,
  ensureIdempotencyKey: () => {
    const existing = get().idempotencyKey;
    if (existing) return existing;
    const key = newKey();
    set({ idempotencyKey: key });
    return key;
  },
  setStep: (step) => set({ step }),
  setOrderId: (orderId) => set({ orderId }),
  reset: () => set({ idempotencyKey: null, step: 'review', orderId: null }),
}));
