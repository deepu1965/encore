import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ListingStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<ListingStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  LISTED: { label: 'Listed', variant: 'success' },
  MATCHING: { label: 'Matching', variant: 'info' },
  MATCHED: { label: 'Matched', variant: 'success' },
  SOLD: { label: 'Sold', variant: 'default' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  EXPIRED: { label: 'Expired', variant: 'default' },
};

export interface ListingCardProps {
  id: string;
  eventName: string;
  section: string;
  row: string;
  seat: string;
  priceCents: number;
  status: ListingStatus;
  className?: string;
}

export function ListingCard({
  id,
  eventName,
  section,
  row,
  seat,
  priceCents,
  status,
  className,
}: ListingCardProps) {
  const config = statusConfig[status];
  return (
    <Card className={cn('', className)}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-h4 font-semibold text-foreground">{eventName}</h3>
          <p className="text-caption text-muted">
            Section {section}, Row {row}, Seat {seat}
          </p>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
        <p className="text-body font-medium text-foreground">
          ${(priceCents / 100).toFixed(2)}
        </p>
        <p className="text-caption text-muted">ID: {id}</p>
      </div>
    </Card>
  );
}
