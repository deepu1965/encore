'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { telemetry } from '@/lib/telemetry';

/**
 * Shared body for route-group error boundaries. Keeps each group's
 * `error.tsx` a thin wrapper so an ops crash never renders the customer
 * boundary and vice versa, while the presentation stays consistent.
 */
export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  description = 'An unexpected error occurred in this area. You can try again.',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    telemetry.captureError(error, { requestId: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h2">{title}</h1>
      <p className="max-w-md text-body text-muted">{description}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
