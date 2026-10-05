'use client';

import { useState, useMemo } from 'react';
import { useOrganizerStats, useOrganizerEvents } from '@/features/organizer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  Ticket, 
  Calendar as CalIcon, 
  Plus, 
  TrendingUp, 
  Percent, 
  ArrowRight, 
  Search, 
  Layers,
  MapPin
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrganizerDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useOrganizerStats();
  const { data: events, isLoading: eventsLoading } = useOrganizerEvents();
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const totalRev = stats?.totalRevenueCents ?? 0;
  const ticketsSold = stats?.totalTicketsSold ?? 0;
  const activeEventsCount = stats?.activeEventsCount ?? 0;

  const activeEvents = useMemo(() => {
    const list = events?.filter(e => e.status !== 'COMPLETED') ?? [];
    if (!searchQuery) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venueName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [events, searchQuery]);

  const avgOccupancy = useMemo(() => {
    if (!events || events.length === 0) return 0;
    const totalSold = events.reduce((acc, e) => acc + (e.ticketsSold || 0), 0);
    const totalCap = events.reduce((acc, e) => acc + (e.totalCapacity || 50), 0);
    return totalCap > 0 ? Math.round((totalSold / totalCap) * 100) : 0;
  }, [events]);

  if (statsLoading || eventsLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-60 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Organizer Command Console</h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
              Live Fleet Telemetry
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time box office yields, inventory allocation, and event operations across all venues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/organizer/events">
            <Button variant="outline" size="sm">
              <Layers className="w-4 h-4 mr-1.5" /> All Events
            </Button>
          </Link>
          <Link href="/organizer/events/new">
            <Button size="sm" variant="primary" className="shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" /> Create Event
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Card className="p-5 flex flex-col justify-between bg-card border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Gross Revenue</span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground mt-2 tracking-tight">
            ${(totalRev / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> 100% Settled via Stripe/Escrow
          </p>
        </Card>
        
        <Card className="p-5 flex flex-col justify-between bg-card border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Tickets Sold</span>
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground mt-2 tracking-tight">
            {ticketsSold.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Across Primary & Partner Channels
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-between bg-card border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Active Fleet Events</span>
            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
              <CalIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground mt-2 tracking-tight">
            {activeEventsCount}
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            On Sale & Scheduled Nationwide
          </p>
        </Card>

        <Card className="p-5 flex flex-col justify-between bg-card border shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Avg Inventory Occupancy</span>
            <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground mt-2 tracking-tight">
            {avgOccupancy}%
          </p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Capacity Fill Ratio
          </p>
        </Card>
      </div>

      {/* Upcoming / Active Events Table */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Active Events</h2>
            <p className="text-xs text-muted-foreground">Click any event to inspect real-time seat inventory, holds, and box-office yields.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search active events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <Card className="overflow-hidden border shadow-sm">
          {activeEvents.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <CalIcon className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="font-medium text-sm">No active events found.</p>
              <Link href="/organizer/events/new">
                <Button size="sm" variant="outline">Create Your First Event</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {activeEvents.map(evt => {
                const fillPct = evt.totalCapacity > 0 ? Math.round((evt.ticketsSold / evt.totalCapacity) * 100) : 0;
                return (
                  <div 
                    key={evt.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/organizer/events/${evt.id}`)}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base leading-snug group-hover:text-primary transition-colors truncate">
                          {evt.name}
                        </h4>
                        <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${
                          evt.status === 'SOLD_OUT' 
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' 
                            : evt.status === 'ON_SALE' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {evt.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalIcon className="w-3.5 h-3.5" />
                          {new Date(evt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5" />
                          {evt.venueName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 sm:text-right">
                      {/* Capacity progress */}
                      <div className="w-36 space-y-1 text-left sm:text-right">
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                          <span className="font-bold">{evt.ticketsSold} / {evt.totalCapacity}</span>
                          <span className="text-[10px] text-muted-foreground">({fillPct}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              fillPct >= 90 ? 'bg-rose-500' : fillPct >= 50 ? 'bg-amber-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(fillPct, 100)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tickets Sold</p>
                      </div>

                      {/* Revenue */}
                      {evt.revenueCents !== undefined && (
                        <div className="hidden md:block w-28 text-right">
                          <p className="font-bold text-sm text-foreground">
                            ${(evt.revenueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross Yield</p>
                        </div>
                      )}

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
