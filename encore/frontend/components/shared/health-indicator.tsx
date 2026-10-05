import { cn } from '@/lib/utils';
import type { ServiceHealth } from './service-status';

const healthColor: Record<ServiceHealth, string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-error',
};

export interface HealthIndicatorProps {
  health: ServiceHealth;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

export function HealthIndicator({ health, size = 'md', className, pulse }: HealthIndicatorProps) {
  const sizePx = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' }[size];

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizePx,
        healthColor[health],
        pulse && health === 'degraded' && 'animate-pulse',
        className,
      )}
      role="status"
      aria-label={`Service ${health}`}
    />
  );
}
