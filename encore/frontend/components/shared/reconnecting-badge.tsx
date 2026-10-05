'use client';

import { cn } from '@/lib/utils';

export interface ReconnectingBadgeProps {
  isReconnecting: boolean;
  className?: string;
}

export function ReconnectingBadge({ isReconnecting, className }: ReconnectingBadgeProps) {
  if (!isReconnecting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-warning/20 border border-warning px-3 py-1 text-caption text-foreground',
        className,
      )}
    >
      <span className="animate-pulse">●</span>
      <span>Reconnecting...</span>
    </div>
  );
}
