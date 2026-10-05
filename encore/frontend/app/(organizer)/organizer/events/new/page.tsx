'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function OrganizerNewEventPage() {
  const router = useRouter();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // API Call to create event
    router.push('/organizer/events');
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="space-y-2 border-b pb-4">
        <h1 className="text-h2 font-bold">Create New Event</h1>
        <p className="text-muted-foreground">Set up the initial details for your upcoming event.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleCreate} className="space-y-6">
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input type="text" required placeholder="e.g. Summer Music Festival 2026" />
          </div>
          
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input type="datetime-local" required />
          </div>

          <div className="space-y-2">
            <Label>Venue Name</Label>
            <Input required placeholder="e.g. Grand Arena" />
          </div>

          <div className="space-y-2">
            <Label>Total Capacity</Label>
            <Input type="number" required min="1" placeholder="e.g. 5000" />
          </div>

          <div className="pt-4 border-t flex justify-end gap-4">
            <Button variant="ghost" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">Create Draft Event</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
