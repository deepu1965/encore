import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/shared/metric-card';
import { cn } from '@/lib/utils';

export interface KafkaPanelProps {
  messagesPerSec: number;
  bytesPerSec: number;
  consumerLag: number;
  partitionCount: number;
  className?: string;
}

export function KafkaPanel({
  messagesPerSec,
  bytesPerSec,
  consumerLag,
  partitionCount,
  className,
}: KafkaPanelProps) {
  return (
    <Card className={cn('p-4 space-y-4', className)}>
      <h3 className="text-h4 font-medium">Kafka</h3>
      <div className="grid grid-cols-2 gap-4">
        <MetricCard label="Messages/sec" value={messagesPerSec.toLocaleString()} />
        <MetricCard label="Bytes/sec" value={bytesPerSec.toLocaleString()} />
        <MetricCard label="Consumer lag" value={consumerLag.toLocaleString()} />
        <MetricCard label="Partitions" value={partitionCount} />
      </div>
    </Card>
  );
}
