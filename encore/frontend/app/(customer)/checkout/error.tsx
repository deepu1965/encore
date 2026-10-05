'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { telemetry } from '@/lib/telemetry';

/**
 * Checkout-specific error boundary. A crash mid-payment must NOT present a
 * generic "just try again" — the charge may have gone through. This renders
 * a PaymentUnknownState that steers the user to check order status rather
 * than blindly retrying (the full recovery flow lands in Phase 7).
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    telemetry.captureError(error, { requestId: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h2">We&apos;re confirming your payment</h1>
      <p className="max-w-md text-body text-muted">
        Something interrupted checkout. Your payment may still have gone through — please check your
        orders before trying again so you aren&apos;t charged twice.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => (window.location.href = '/orders')}>
          Check my orders
        </Button>
        <Button onClick={reset}>Reload checkout</Button>
      </div>
    </div>
  );
}
