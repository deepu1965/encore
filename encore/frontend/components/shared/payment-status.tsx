import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PaymentStatus as PaymentStatusType } from '@/types';

const statusConfig: Record<PaymentStatusType, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  INITIAL: { label: 'Initializing', variant: 'default' },
  PROCESSING: { label: 'Processing', variant: 'info' },
  SUCCESS: { label: 'Paid', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
  TIMEOUT: { label: 'Timed out', variant: 'warning' },
  UNKNOWN: { label: 'Unknown', variant: 'warning' },
  RETRYING: { label: 'Retrying', variant: 'info' },
  CANCELLED: { label: 'Cancelled', variant: 'default' },
};

export interface PaymentStatusProps {
  status: PaymentStatusType;
  className?: string;
}

export function PaymentStatus({ status, className }: PaymentStatusProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn('capitalize', className)}>
      {config.label}
    </Badge>
  );
}
