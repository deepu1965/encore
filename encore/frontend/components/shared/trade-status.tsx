import { Badge } from '@/components/ui/badge';
import type { TradeStatus as TradeStatusType } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<TradeStatusType, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  CREATED: { label: 'Created', variant: 'info' },
  SETTLING: { label: 'Settling', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
};

export interface TradeStatusProps {
  status: TradeStatusType;
  className?: string;
}

export function TradeStatus({ status, className }: TradeStatusProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn('', className)}>
      {config.label}
    </Badge>
  );
}
