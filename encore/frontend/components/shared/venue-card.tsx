import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface VenueCardProps {
  id: string;
  name: string;
  city: string;
  state?: string;
  upcomingEventCount?: number;
  className?: string;
}

export function VenueCard({ id, name, city, state, upcomingEventCount, className }: VenueCardProps) {
  return (
    <Link href={`/venues/${id}`} className="block group">
      <Card variant="interactive" className={cn('', className)}>
        <h3 className="text-h4 font-semibold text-foreground group-hover:text-primary">{name}</h3>
        <p className="text-caption text-muted mt-1">
          {city}
          {state ? `, ${state}` : ''}
        </p>
        {upcomingEventCount !== undefined && (
          <p className="text-body text-muted mt-2">{upcomingEventCount} upcoming events</p>
        )}
      </Card>
    </Link>
  );
}
