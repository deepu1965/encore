import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit, ListOrdered, Users, LineChart, ShieldAlert, MessageSquare, Image, Bell } from 'lucide-react';

export default function OrganizerEventLayout({ children, params }: { children: ReactNode, params: { eventId: string } }) {
  const { eventId } = params;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-muted/10">
        <div className="flex items-center px-6 h-14 overflow-x-auto whitespace-nowrap gap-6 text-sm font-medium">
          <Link href="/organizer/events" className="text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="w-px h-4 bg-border mx-2 shrink-0" />
          <Link href={`/organizer/events/${eventId}`} className="hover:text-primary">Overview</Link>
          <Link href={`/organizer/events/${eventId}/edit`} className="hover:text-primary">Edit</Link>
          <Link href={`/organizer/events/${eventId}/inventory`} className="hover:text-primary">Inventory</Link>
          <Link href={`/organizer/events/${eventId}/waiting-room`} className="hover:text-primary flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> Waiting Room</Link>
          <Link href={`/organizer/events/${eventId}/orders`} className="hover:text-primary">Orders</Link>
          <Link href={`/organizer/events/${eventId}/resale`} className="hover:text-primary">Resale</Link>
          <Link href={`/organizer/events/${eventId}/analytics`} className="hover:text-primary">Analytics</Link>
          <Link href={`/organizer/events/${eventId}/attendees`} className="hover:text-primary">Attendees</Link>
          <Link href={`/organizer/events/${eventId}/chat`} className="hover:text-primary">Chat</Link>
          <Link href={`/organizer/events/${eventId}/media`} className="hover:text-primary">Media</Link>
          <Link href={`/organizer/events/${eventId}/notifications`} className="hover:text-primary">Notifications</Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
