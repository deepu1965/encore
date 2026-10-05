'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export function HoldExpiredModal({ eventId }: { eventId: string }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="max-w-md p-6 space-y-6 shadow-xl border-destructive/20 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Your hold has expired</h2>
            <p className="text-sm text-muted-foreground">
              Because checkout took longer than the allotted time, your seat has been released for others to purchase.
            </p>
          </div>
        </div>
        <div className="pt-4 border-t w-full">
          <Button 
            className="w-full" 
            onClick={() => router.push(`/events/${eventId}/select-seats`)}
          >
            Select a New Seat
          </Button>
        </div>
      </Card>
    </div>
  );
}
