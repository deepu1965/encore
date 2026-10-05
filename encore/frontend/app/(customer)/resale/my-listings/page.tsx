'use client';

import { useMyListings, useCancelListing } from '@/features/resale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

export default function MyListingsPage() {
  const { data: listings, isLoading } = useMyListings();
  const cancelListing = useCancelListing();
  const router = useRouter();

  if (isLoading) return <div className="p-12 text-center">Loading listings...</div>;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <h1 className="text-h2 font-bold">My Resale Listings</h1>
      
      <Card className="overflow-hidden border">
        {(!listings || listings.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground">
            You have no active resale listings.
          </div>
        ) : (
          <div className="divide-y">
            {listings.map(listing => (
              <div key={listing.listingId} className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">${(listing.askPriceCents / 100).toFixed(2)}</p>
                    <Badge variant="outline" className="uppercase text-xs">{listing.status}</Badge>
                  </div>
                  {(listing as any).eventName && (
                    <p className="text-sm font-semibold text-foreground">{(listing as any).eventName}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Sec {listing.section || 'GA'}, Row {listing.row || '-'}, Seat {listing.seatNumber || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Listed on {new Date(listing.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push(`/resale/listings/${listing.listingId}`)}>
                    View
                  </Button>
                  {(listing.status === 'ACTIVE' || listing.status === 'LISTED') && (
                    <Button 
                      variant="destructive" 
                      onClick={() => cancelListing.mutate(listing.listingId)}
                      disabled={cancelListing.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
