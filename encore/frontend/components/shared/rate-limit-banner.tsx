'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export interface RateLimitBannerProps {
  retryAfterSeconds: number;
  onRetry?: () => void;
  className?: string;
}

export function RateLimitBanner({ retryAfterSeconds, onRetry, className }: RateLimitBannerProps) {
  const [remaining, setRemaining] = useState(retryAfterSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remaining === 0 && onRetry) {
      onRetry();
    }
  }, [remaining, onRetry]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-center justify-between gap-4 rounded-md border border-warning bg-warning/10 px-4 py-3',
        className,
      )}
    >
      <p className="text-body text-foreground">
        Rate limited. Try again in {remaining}s.
      </p>
      {remaining === 0 && onRetry && (
        <button
          onClick={onRetry}
          className="text-label font-medium text-primary hover:underline"
        >
          Retry now
        </button>
      )}
    </div>
  );
}
