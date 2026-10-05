'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { telemetry } from '@/lib/telemetry';

/**
 * Root error boundary — catches anything not caught by a route-group
 * boundary. Must be a client component per Next.js App Router.
 */
export default function RootError({
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
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex max-w-md flex-col items-center gap-4 px-4 text-center">
          <h1 className="text-h2">Something went wrong</h1>
          <p className="text-body text-muted">
            An unexpected error occurred. You can try again, and we&apos;ve been notified.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
