'use client';

import { useState, useEffect } from 'react';
import { EventCard } from '@/components/shared/event-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useNearbyEvents } from '@/features/discovery/queries';

export default function NearMePage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError('Unable to retrieve your location.');
        setIsLocating(false);
      }
    );
  }, []);

  const { data: events, isLoading: eventsLoading, error: eventsError } = useNearbyEvents(
    location?.lat ?? 0,
    location?.lng ?? 0
  );

  // When lat/lng are 0, useNearbyEvents won't be enabled.
  const isLoading = isLocating || (!!location && eventsLoading);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1 font-bold">Near me</h1>
        <p className="text-body text-muted mt-1">
          Discover events happening around your current location.
        </p>
      </header>

      <div className="flex-1">
        {locationError && !location && (
          <EmptyState
            title="Location access required"
            description={locationError}
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {eventsError && !isLoading && (
          <EmptyState
            title="Unable to load events"
            description="Something went wrong while fetching nearby events."
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        )}

        {!isLoading && !eventsError && location && events?.length === 0 && (
          <EmptyState
            title="No events nearby"
            description="There are no events happening around you right now."
          />
        )}

        {!isLoading && !eventsError && location && events && events.length > 0 && (
          <>
            <p className="text-caption text-muted mb-4">
              {events.length} events near you
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  name={event.name}
                  venueName={event.venueName ?? 'Venue TBD'}
                  startsAt={event.startsAt}
                  status={event.status}
                  posterImageUrl={event.posterImageUrl}
                  minPriceCents={event.minPriceCents}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
