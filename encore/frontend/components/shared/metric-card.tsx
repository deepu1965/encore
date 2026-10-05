import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function MetricCard({ label, value, unit, trend, trendValue, className }: MetricCardProps) {
  return (
    <Card className={cn('p-4', className)}>
      <p className="text-caption text-muted">{label}</p>
      <p className="text-display font-bold text-foreground tabular-nums mt-1">
        {value}
        {unit && <span className="text-h4 ml-1">{unit}</span>}
      </p>
      {trend && trendValue && (
        <p
          className={cn(
            'text-caption mt-2',
            trend === 'up' && 'text-success',
            trend === 'down' && 'text-error',
            trend === 'neutral' && 'text-muted',
          )}
        >
          {trend === 'up' && '↑'}
          {trend === 'down' && '↓'}
          {trendValue}
        </p>
      )}
    </Card>
  );
}
