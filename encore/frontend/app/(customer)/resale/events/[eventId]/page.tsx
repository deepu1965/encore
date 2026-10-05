'use client';

import { useEventListings } from '@/features/resale';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { resaleKeys } from '@/features/resale/types';

export default function ResaleEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const { data: listings, isLoading } = useEventListings(eventId);
  const queryClient = useQueryClient();

  // WS subscription for order book
  useEffect(() => {
    if (!eventId) return;
    const ws = getWebSocketManager();
    const channel = `resale.${eventId}`;

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: resaleKeys.eventListings(eventId) });
    };

    const unsubCreated = ws.subscribe(channel, 'listing.created', handleUpdate);
    const unsubCancelled = ws.subscribe(channel, 'listing.cancelled', handleUpdate);
    const unsubMatching = ws.subscribe(channel, 'listing.matching', handleUpdate);

    return () => {
      unsubCreated();
      unsubCancelled();
      unsubMatching();
    };
  }, [eventId, queryClient]);

  if (isLoading) return <div className="p-12 text-center">Loading order book...</div>;

  const activeListings = listings?.filter(l => l.status === 'LISTED' || l.status === 'ACTIVE') || [];
  // Sort by price-time priority (lowest price first, then oldest)
  activeListings.sort((a, b) => {
    if (a.askPriceCents !== b.askPriceCents) return a.askPriceCents - b.askPriceCents;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.push('/resale')} className="-ml-4">
        &larr; Marketplace
      </Button>
      
      <div className="space-y-2">
        <h1 className="text-h2 font-bold">Resale Tickets</h1>
        <p className="text-muted-foreground">Event ID: {eventId}</p>
      </div>

      <Card className="overflow-hidden border">
        {activeListings.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No resale tickets currently available for this event.
          </div>
        ) : (
          <div className="divide-y">
            {activeListings.map(listing => (
              <div key={listing.listingId} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-semibold text-lg">${(listing.askPriceCents / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">
                    Sec {listing.section}, Row {listing.row}, Seat {listing.seatNumber}
                  </p>
                </div>
                <Button onClick={() => router.push(`/resale/listings/${listing.listingId}`)}>
                  Buy
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
