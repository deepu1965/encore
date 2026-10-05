import { cn } from '@/lib/utils';

export interface QueuePositionProps {
  position: number;
  estimatedWaitSeconds?: number;
  className?: string;
}

export function QueuePosition({ position, estimatedWaitSeconds, className }: QueuePositionProps) {
  const estimatedWait = estimatedWaitSeconds ? formatWaitTime(estimatedWaitSeconds) : undefined;

  return (
    <div className={cn('text-center', className)} role="status" aria-live="polite">
      <p className="text-display text-h2 font-bold text-foreground">#{position}</p>
      <p className="text-body text-muted">in line</p>
      {estimatedWait && (
        <p className="text-caption text-muted mt-1">Estimated wait: {estimatedWait}</p>
      )}
    </div>
  );
}

function formatWaitTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}
