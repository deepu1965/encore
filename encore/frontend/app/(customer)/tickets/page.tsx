'use client';

import { useTickets } from '@/features/tickets';
import { TicketCard } from '@/components/shared/ticket-card';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { getWebSocketManager } from '@/lib/websocket-manager';
import { useQueryClient } from '@tanstack/react-query';
import { ticketKeys } from '@/features/tickets/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Ticket as TicketIcon, Calendar, MapPin, QrCode, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import Link from 'next/link';

export default function TicketsPage() {
  const { data: tickets, isLoading } = useTickets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // WS subscription for real-time ticket updates
  useEffect(() => {
    const ws = getWebSocketManager();
    const userId = 'me'; // In real app, from auth state
    const channel = `orders.${userId}`;

    const unsubAdd = ws.subscribe(channel, 'ticket.added', () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all() });
    });
    
    const unsubRem = ws.subscribe(channel, 'ticket.removed', () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.all() });
    });

    return () => {
      unsubAdd();
      unsubRem();
    };
  }, [queryClient]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter(t => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.eventName?.toLowerCase().includes(q) ||
        t.venueName?.toLowerCase().includes(q) ||
        t.section?.toLowerCase().includes(q) ||
        t.ticketId?.toLowerCase().includes(q) ||
        t.ticketCode?.toLowerCase().includes(q)
      );
    });
  }, [tickets, searchQuery]);

  const upcoming = useMemo(() => {
    return filteredTickets.filter(t => t.status === 'ACTIVE' || t.status === 'ISSUED');
  }, [filteredTickets]);

  const past = useMemo(() => {
    return filteredTickets.filter(t => t.status !== 'ACTIVE' && t.status !== 'ISSUED');
  }, [filteredTickets]);

  const displayedTickets = useMemo(() => {
    if (activeTab === 'upcoming') return upcoming;
    if (activeTab === 'past') return past;
    return filteredTickets;
  }, [activeTab, upcoming, past, filteredTickets]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 space-y-6">
        <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-48 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalCount = tickets?.length ?? 0;
  const upcomingCount = tickets?.filter(t => t.status === 'ACTIVE' || t.status === 'ISSUED').length ?? 0;
  const pastCount = tickets?.filter(t => t.status === 'USED').length ?? 0;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">My Ticket Vault</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Dynamic Cryptographic QR
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Access your admission passes, rotating entrance QR codes, and 100% verified fan-to-fan resale.
          </p>
        </div>
        <Link href="/explore">
          <Button variant="primary" size="sm" className="shadow-sm">
            <TicketIcon className="w-4 h-4 mr-2" /> Explore More Events
          </Button>
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Tickets</span>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm border-l-4 border-l-primary">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Active & Upcoming</span>
          <p className="text-2xl font-bold mt-1 text-primary">{upcomingCount}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Past / Admitted</span>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{pastCount}</p>
        </div>
      </div>

      {/* Controls: Search & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center bg-muted/30 p-1 rounded-lg border gap-1">
          <Button
            size="sm"
            variant={activeTab === 'upcoming' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('upcoming')}
            className="text-xs font-medium"
          >
            Upcoming ({upcomingCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'past' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('past')}
            className="text-xs font-medium"
          >
            Past & Used ({pastCount})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'all' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('all')}
            className="text-xs font-medium"
          >
            All Passes ({totalCount})
          </Button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Ticket Grid */}
      {displayedTickets.length === 0 ? (
        <div className="text-center py-16 px-4 bg-muted/15 border border-dashed rounded-2xl space-y-4">
          <TicketIcon className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No tickets found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchQuery 
                ? "No tickets match your search query. Try clearing the filter."
                : activeTab === 'upcoming'
                ? "You don't have any upcoming events scheduled. Explore top tours and live matches."
                : "No past tickets recorded in your account history."}
            </p>
          </div>
          {searchQuery ? (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          ) : (
            <Link href="/explore">
              <Button size="sm" variant="primary">Browse Events</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {displayedTickets.map((ticket) => {
            const isUpcoming = ticket.status === 'ACTIVE' || ticket.status === 'ISSUED';
            return (
              <div
                key={ticket.ticketId}
                className={`relative group bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  !isUpcoming ? 'opacity-70 bg-muted/5' : 'hover:border-primary/40'
                }`}
              >
                {/* Header ribbon */}
                <div className="p-5 pb-4 border-b border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors">
                        {ticket.eventName}
                      </h3>
                      {ticket.venueName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <span>{ticket.venueName}</span>
                        </p>
                      )}
                      {ticket.eventDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                          <span>{new Date(ticket.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={isUpcoming ? 'default' : 'secondary'}
                      className={`capitalize shrink-0 ${isUpcoming ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                    >
                      {ticket.status.toLowerCase().replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Seat details */}
                <div className="px-5 py-3.5 bg-muted/20 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Section</span>
                      <span className="font-bold text-sm text-foreground">{ticket.section || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Row</span>
                      <span className="font-bold text-sm text-foreground">{ticket.row || '-'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Seat</span>
                      <span className="font-bold text-sm text-foreground">{ticket.number || '-'}</span>
                    </div>
                  </div>
                  {ticket.ticketCode && (
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Pass Code</span>
                      <span className="font-mono text-xs font-semibold text-primary">{ticket.ticketCode}</span>
                    </div>
                  )}
                </div>

                {/* Action footer */}
                <div className="p-4 pt-3 bg-card border-t border-border/40 flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 gap-1.5 text-xs font-medium"
                    onClick={() => router.push(`/tickets/${ticket.ticketId}`)}
                  >
                    <QrCode className="w-3.5 h-3.5" /> View Pass & QR
                  </Button>
                  {isUpcoming && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => router.push(`/tickets/${ticket.ticketId}/sell`)}
                    >
                      <Tag className="w-3.5 h-3.5" /> Sell
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
