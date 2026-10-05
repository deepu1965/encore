'use client';

import { useTicket } from '@/features/tickets';
import { useCreateListing } from '@/features/resale';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function SellTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;

  const { data: ticket, isLoading } = useTicket(ticketId);
  const createListing = useCreateListing();

  const [priceStr, setPriceStr] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (isLoading) return <div className="p-12 text-center">Loading...</div>;
  if (!ticket) return <div className="p-12 text-center text-error">Ticket not found</div>;

  const handleList = async () => {
    setErrorMsg(null);
    const num = parseFloat(priceStr);
    if (isNaN(num) || num <= 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }
    
    // In real app, calculate 150% max face value from the order/event metadata
    const maxFaceValue = 150; 
    if (num > maxFaceValue) {
      setErrorMsg(`Price cannot exceed 150% of face value ($${maxFaceValue}).`);
      return;
    }

    try {
      await createListing.mutateAsync({
        ticketId,
        askPriceCents: Math.round(num * 100),
      });
      router.push('/resale/my-listings');
    } catch (err: any) {
      setErrorMsg("Failed to create listing.");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="-ml-4 mb-4">
        &larr; Back to Ticket
      </Button>
      
      <div className="space-y-2">
        <h1 className="text-h2 font-bold">Sell Your Ticket</h1>
        <p className="text-muted-foreground">{ticket.eventName} • {ticket.venueName}</p>
        <p className="text-sm font-medium">Sec {ticket.section}, Row {ticket.row}, Seat {ticket.number}</p>
      </div>

      <Card className="p-6 space-y-6">
        {errorMsg && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ask-price">Your Ask Price ($)</Label>
            <Input 
              id="ask-price"
              type="number" 
              placeholder="0.00" 
              step="0.01" 
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              disabled={createListing.isPending}
            />
            <p className="text-xs text-muted-foreground">You will receive this amount minus a 5% seller fee.</p>
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleList} 
            disabled={createListing.isPending || !priceStr}
          >
            {createListing.isPending ? 'Listing...' : 'List Ticket for Resale'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
