'use client';

import { useOrganizerEvent } from '@/features/organizer';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function OrganizerEventHubPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const { data: evt, isLoading } = useOrganizerEvent(eventId);

  if (isLoading) return <div className="p-12 text-center animate-pulse">Loading event...</div>;
  if (!evt) return <div className="p-12 text-center text-error">Event not found</div>;

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <h1 className="text-h2 font-bold">{evt.name}</h1>
          <Badge variant="outline" className="uppercase">{evt.status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-muted-foreground">{evt.venueName} • {new Date(evt.date).toLocaleString()}</p>
        <p className="text-sm font-mono text-muted-foreground">ID: {evt.id}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Quick Stats</h3>
          <div className="space-y-4">
             <div className="flex justify-between border-b pb-2">
               <span className="text-muted-foreground">Tickets Sold</span>
               <span className="font-bold">{evt.ticketsSold} / {evt.totalCapacity}</span>
             </div>
             <div className="flex justify-between border-b pb-2">
               <span className="text-muted-foreground">Gross Revenue</span>
               <span className="font-bold">${(evt.revenueCents / 100).toFixed(2)}</span>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
