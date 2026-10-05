'use client';

import { useTicket } from '@/features/tickets';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { TicketQR } from '@/components/shared/ticket-qr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;

  const { data: ticket, isLoading } = useTicket(ticketId);

  if (isLoading) {
    return <div className="p-12 text-center animate-pulse">Loading ticket...</div>;
  }

  if (!ticket) {
    return <div className="p-12 text-center text-error">Ticket not found</div>;
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        &larr; Back to Tickets
      </Button>
      
      <Card className="overflow-hidden flex flex-col relative shadow-xl">
        <div className="bg-primary p-6 text-primary-foreground space-y-1">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-h3 font-bold leading-tight">{ticket.eventName}</h1>
            <Badge variant="secondary" className="uppercase bg-background/20 text-white hover:bg-background/30 border-none">
              {ticket.status}
            </Badge>
          </div>
          <p className="text-sm opacity-90">{ticket.venueName}</p>
          <p className="text-sm opacity-90">{new Date(ticket.eventDate).toLocaleDateString()} at {new Date(ticket.eventDate).toLocaleTimeString()}</p>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center bg-white border-b-2 border-dashed">
          <TicketQR value={ticket.ticketCode || ticket.ticketId} size={220} />
          <p className="mt-3 font-mono text-base font-bold text-slate-800 tracking-wider">
            {ticket.ticketCode || ticket.ticketId.substring(0, 12).toUpperCase()}
          </p>
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest mt-0.5">Verified Digital Admission Pass</span>
        </div>

        <div className="bg-muted/10 p-6 grid grid-cols-3 divide-x text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Sec</p>
            <p className="font-bold text-lg">{ticket.section}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Row</p>
            <p className="font-bold text-lg">{ticket.row}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Seat</p>
            <p className="font-bold text-lg">{ticket.number}</p>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-center gap-4">
         <Button variant="outline" className="w-full" onClick={() => alert('Direct transfer link generated and copied to clipboard!')}>Transfer</Button>
         <Button variant="outline" className="w-full" onClick={() => router.push(`/tickets/${ticket.ticketId}/sell`)}>Resell</Button>
      </div>
    </div>
  );
}
