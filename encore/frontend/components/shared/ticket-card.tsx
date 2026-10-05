import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TicketStatus } from '@/types';
import { cn } from '@/lib/utils';

const statusVariant: Record<TicketStatus, 'default' | 'success' | 'warning' | 'error' | 'primary'> = {
  ISSUED: 'success',
  ACTIVE: 'success',
  USED: 'default',
  CANCELLED: 'error',
  REFUNDED: 'default',
  LISTED_FOR_RESALE: 'warning',
  LISTED: 'warning',
  SOLD: 'default',
  REVOKED: 'error',
  TRANSFERRED: 'primary',
};

export interface TicketCardProps {
  id: string;
  eventName: string;
  eventDate: string;
  section: string;
  row: string;
  seat: string;
  status: TicketStatus;
  className?: string;
}

export function TicketCard({
  id,
  eventName,
  eventDate,
  section,
  row,
  seat,
  status,
  className,
}: TicketCardProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-h4 font-semibold text-foreground">{eventName}</h3>
          <p className="text-caption text-muted">{new Date(eventDate).toLocaleDateString()}</p>
        </div>
        <Badge variant={statusVariant[status]} className="capitalize">
          {status.toLowerCase().replace(/_/g, ' ')}
        </Badge>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-body">
          Section <strong>{section}</strong>, Row <strong>{row}</strong>, Seat <strong>{seat}</strong>
        </p>
        <p className="text-caption text-muted mt-1">Ticket ID: {id}</p>
      </div>
    </Card>
  );
}
