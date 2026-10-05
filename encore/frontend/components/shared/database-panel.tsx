import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/metric-card';
import { cn } from '@/lib/utils';

export interface DatabasePanelProps {
  activeConnections: number;
  idleConnections: number;
  queryLatencyMs: number;
  txPerSec: number;
  className?: string;
}

export function DatabasePanel({
  activeConnections,
  idleConnections,
  queryLatencyMs,
  txPerSec,
  className,
}: DatabasePanelProps) {
  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <h3 className="text-h4 font-medium">Database</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Active connections" value={activeConnections} />
        <MetricCard label="Idle connections" value={idleConnections} />
        <MetricCard label="Query latency" value={queryLatencyMs} unit="ms" />
        <MetricCard label="Tx/sec" value={txPerSec.toLocaleString()} />
      </div>
    </Card>
  );
}
