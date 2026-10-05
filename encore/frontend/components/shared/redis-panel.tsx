import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/metric-card';
import { cn } from '@/lib/utils';

export interface RedisPanelProps {
  connectedClients: number;
  usedMemoryMb: number;
  hitRate: number; // 0-100
  opsPerSec: number;
  className?: string;
}

export function RedisPanel({
  connectedClients,
  usedMemoryMb,
  hitRate,
  opsPerSec,
  className,
}: RedisPanelProps) {
  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <h3 className="text-h4 font-medium">Redis</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Clients" value={connectedClients} />
        <MetricCard label="Memory" value={usedMemoryMb} unit="MB" />
        <MetricCard label="Hit rate" value={hitRate} unit="%" />
        <MetricCard label="Ops/sec" value={opsPerSec.toLocaleString()} />
      </div>
    </Card>
  );
}
