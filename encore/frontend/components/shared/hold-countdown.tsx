'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export interface HoldCountdownProps {
  expiresAt: string; // ISO timestamp
  onExpire?: () => void;
  className?: string;
  /** Warn when this many seconds remain */
  warnThreshold?: number;
}

export function HoldCountdown({ expiresAt, onExpire, className, warnThreshold = 60 }: HoldCountdownProps) {
  const [remaining, setRemaining] = useState(() => calculateRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = calculateRemaining(expiresAt);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining <= warnThreshold && remaining > 0;

  return (
    <div
      className={cn(
        'text-body font-mono tabular-nums',
        isWarning && 'text-warning',
        remaining <= 0 && 'text-error',
        className,
      )}
      role="timer"
      aria-label={`${minutes} minutes ${seconds} seconds remaining`}
    >
      {remaining > 0 ? (
        <>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </>
      ) : (
        'Expired'
      )}
    </div>
  );
}

function calculateRemaining(expiresAt: string): number {
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((expiry - now) / 1000));
}
