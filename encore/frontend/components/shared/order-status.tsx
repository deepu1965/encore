import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  PENDING: { label: 'Pending', variant: 'warning' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
  REFUNDED: { label: 'Refunded', variant: 'default' },
  EXPIRED: { label: 'Expired', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

export interface OrderStatusProps {
  status: OrderStatus;
  className?: string;
}

export function OrderStatus({ status, className }: OrderStatusProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
}
