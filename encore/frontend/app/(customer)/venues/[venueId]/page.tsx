'use client';

import { useParams } from 'next/navigation';


import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EventCard } from '@/components/shared/event-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useVenue, useVenueEvents } from '@/features/discovery/queries';

export default function VenueDetailsPage() {
  const params = useParams();
  const venueId = params.venueId as string;

  const { data: venue, isLoading: isLoadingVenue, error: venueError } = useVenue(venueId);
  const { data: events, isLoading: isLoadingEvents } = useVenueEvents(venueId);

  const isLoading = isLoadingVenue || isLoadingEvents;

  if (isLoadingVenue) {
    return (
      <section className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (venueError || !venue) {
    return (
      <EmptyState
        title="Venue not found"
        description="This venue doesn't exist or has been removed."
        action={{ label: 'Browse venues', onClick: () => window.history.back() }}
      />
    );
  }

  return (
    <section className="space-y-8">
      {/* Venue Header */}
      <Card className="p-6">
        <h1 className="text-h1 font-bold text-foreground">{venue.name}</h1>
        <p className="text-body text-muted mt-2">
          {[venue.city, venue.state, venue.country].filter(Boolean).join(', ')}
        </p>
        {venue.address && (
          <p className="text-caption text-muted mt-1">{venue.address}</p>
        )}
        {venue.capacity && (
          <Badge variant="default" className="mt-4">
            Capacity: {venue.capacity.toLocaleString()}
          </Badge>
        )}
      </Card>

      {/* Upcoming Events */}
      <div>
        <h2 className="text-h2 font-semibold mb-4">Upcoming events</h2>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isLoading && (!events || events.length === 0) && (
          <EmptyState
            title="No upcoming events"
            description="There are no events scheduled at this venue."
          />
        )}

        {!isLoading && events && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                id={event.id}
                name={event.name}
                venueName={venue.name}
                startsAt={event.startsAt}
                status={event.status}
                posterImageUrl={event.posterImageUrl}
                minPriceCents={event.minPriceCents}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
