'use client';

import { useListing, useBuyListing } from '@/features/resale';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResaleListingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;

  const { data: listing, isLoading } = useListing(listingId);
  const buyListing = useBuyListing();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // WS subscription for this specific listing
  useEffect(() => {
    if (!listingId) return;
    const ws = getWebSocketManager();
    const channel = `resale.listing.${listingId}`;

    const unsubMatched = ws.subscribe(channel, 'listing.matched', () => {
      // Handle someone else buying it while we look
    });

    return () => unsubMatched();
  }, [listingId]);

  if (isLoading) return <div className="p-12 text-center">Loading listing...</div>;
  if (!listing) return <div className="p-12 text-center text-error">Listing not found</div>;

  const handleBuy = async () => {
    setErrorMsg(null);
    try {
      const trade = await buyListing.mutateAsync({ listingId });
      // Redirect to trade settlement timeline
      router.push(`/resale/trades/${trade.tradeId}`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setErrorMsg('Sorry, this ticket was just purchased by someone else.');
      } else {
        setErrorMsg('Failed to process purchase.');
      }
    }
  };

  const isAvailable = listing.status === 'ACTIVE' || listing.status === 'LISTED';

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="-ml-4 mb-4">
        &larr; Back
      </Button>
      
      <div className="space-y-2">
        <h1 className="text-h2 font-bold">Resale Ticket</h1>
        <p className="text-muted-foreground">Listing #{listing.listingId}</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <p className="font-semibold text-xl">Sec {listing.section}, Row {listing.row}, Seat {listing.seatNumber}</p>
            <p className="text-muted-foreground">Event: {listing.eventId}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-3xl">${(listing.askPriceCents / 100).toFixed(2)}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {!isAvailable && !errorMsg && (
          <div className="bg-warning/10 text-warning-foreground px-4 py-3 rounded-md text-sm flex gap-2 items-center justify-center font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            This ticket is no longer available.
          </div>
        )}

        <div className="space-y-4 pt-2">
           <h3 className="font-medium">Buyer Guarantee</h3>
           <p className="text-sm text-muted-foreground leading-relaxed">
             This is a verified resale ticket. 
             If purchased, the ticket ownership will be transferred directly to your account immediately upon payment settlement.
           </p>
        </div>

        <div className="pt-6 border-t">
          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleBuy}
            disabled={!isAvailable || buyListing.isPending}
          >
            {buyListing.isPending ? 'Processing...' : `Buy for $${(listing.askPriceCents / 100).toFixed(2)}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
