import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ServiceHealth = 'healthy' | 'degraded' | 'down';

const healthConfig: Record<ServiceHealth, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  healthy: { label: 'Healthy', variant: 'success' },
  degraded: { label: 'Degraded', variant: 'warning' },
  down: { label: 'Down', variant: 'error' },
};

export interface ServiceStatusProps {
  name: string;
  health: ServiceHealth;
  className?: string;
}

export function ServiceStatus({ name, health, className }: ServiceStatusProps) {
  const config = healthConfig[health];
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <span className="text-body text-foreground">{name}</span>
      <Badge variant={config.variant}>{config.label}</Badge>
    </div>
  );
}
