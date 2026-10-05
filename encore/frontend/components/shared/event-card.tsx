import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { EventStatus } from '@/types';
import { cn } from '@/lib/utils';

export interface EventCardProps {
  id: string;
  name: string;
  venueName: string;
  startsAt: string;
  status: EventStatus;
  posterImageUrl?: string;
  minPriceCents?: number;
  className?: string;
}

const statusLabel: Record<EventStatus, string> = {
  SCHEDULED: 'Coming soon',
  ON_SALE: 'On sale',
  SOLD_OUT: 'Sold out',
  CANCELLED: 'Cancelled',
};

const statusVariant: Record<EventStatus, 'default' | 'success' | 'warning' | 'error'> = {
  SCHEDULED: 'default',
  ON_SALE: 'success',
  SOLD_OUT: 'warning',
  CANCELLED: 'error',
};

export function EventCard({
  id,
  name,
  venueName,
  startsAt,
  status,
  posterImageUrl,
  minPriceCents,
  className,
}: EventCardProps) {
  const date = new Date(startsAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Link href={`/events/${id}`} className="group block">
      <Card variant="interactive" padding="none" className={cn('overflow-hidden', className)}>
        <div className="relative aspect-[3/4] w-full bg-surface">
          {posterImageUrl ? (
            <Image src={posterImageUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">No image</div>
          )}
          <Badge variant={statusVariant[status]} className="absolute top-2 right-2">
            {statusLabel[status]}
          </Badge>
        </div>
        <div className="p-3">
          <h3 className="text-h4 font-semibold text-foreground truncate group-hover:text-primary">
            {name}
          </h3>
          <p className="text-caption text-muted mt-1">{venueName}</p>
          <p className="text-caption text-muted">
            {formattedDate} · {formattedTime}
          </p>
          {minPriceCents !== undefined && (
            <p className="text-body font-medium text-foreground mt-2">
              From ${(minPriceCents / 100).toFixed(2)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
