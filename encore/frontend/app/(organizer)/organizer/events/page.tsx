'use client';

import { useOrganizerEvents } from '@/features/organizer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export default function OrganizerEventsPage() {
  const { data: events, isLoading } = useOrganizerEvents();
  const router = useRouter();

  if (isLoading) return <div className="p-12 text-center animate-pulse">Loading events...</div>;

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-h2 font-bold">Manage Events</h1>
        <Button onClick={() => router.push('/organizer/events/new')}>
          <Plus className="w-4 h-4 mr-2" /> Create Event
        </Button>
      </div>

      <Card className="overflow-hidden border">
        {(!events || events.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground">No events found. Create your first event!</div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-3 font-medium">Event Name</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Venue</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Sold / Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map(evt => (
                <tr 
                  key={evt.id} 
                  onClick={() => router.push(`/organizer/events/${evt.id}`)}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-bold">{evt.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(evt.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-muted-foreground">{evt.venueName}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="uppercase text-[10px]">{evt.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    {evt.ticketsSold} / {evt.totalCapacity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
