'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ShieldCheck, Tag, ArrowRight, Zap, RefreshCw, Calendar, MapPin, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useResaleEventsSummary } from '@/features/resale';

export default function ResaleMarketplacePage() {
  const router = useRouter();
  const { data: summaryEvents, isLoading } = useResaleEventsSummary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  // Fallback if initial load or offline
  const defaultEvents: import('@/features/resale').ResaleEventSummary[] = [
    { id: '7d431451-e68b-4768-b326-f8c1e34496e1', name: 'Zakir Hussain & Masters of Percussion', venue: 'EKA Arena TransStadia, Ahmedabad', city: 'Ahmedabad', activeListings: 26, minPriceCents: 76094, startsAt: '2026-11-28T14:25:57Z' },
    { id: '746518d4-2e28-4dbd-8c54-7ab293910cbd', name: 'Dualist Inquiry: When We Feel Live', venue: 'M. A. Chidambaram Stadium, Chennai', city: 'Chennai', activeListings: 7, minPriceCents: 79043, startsAt: '2026-10-09T14:25:57Z' },
    { id: 'd6d10ce8-d03e-4878-8d93-710d778eeb8c', name: 'Anuv Jain: Guldasta India Tour', venue: 'Indira Gandhi Arena, Delhi', city: 'Delhi', activeListings: 7, minPriceCents: 78693, startsAt: '2026-12-03T13:25:57Z' },
    { id: '327460a4-acd7-4ab1-8ddc-2456da57f913', name: 'Arijit Singh: Soulful Symphony Live', venue: 'Eden Gardens, Kolkata', city: 'Kolkata', activeListings: 6, minPriceCents: 145166, startsAt: '2026-11-29T12:25:57Z' },
    { id: '937b1788-d83d-4304-b381-30bdac40fb58', name: 'Prateek Kuhad: Silhouettes Acoustic Tour', venue: 'Shilpakala Vedika, Hyderabad', city: 'Hyderabad', activeListings: 4, minPriceCents: 156678, startsAt: '2026-12-10T10:25:57Z' },
  ];

  const eventsList = (summaryEvents && summaryEvents.length > 0) ? summaryEvents : defaultEvents;

  const cities = useMemo(() => {
    const set = new Set<string>();
    eventsList.forEach(e => {
      if (e.city) set.add(e.city);
    });
    return Array.from(set);
  }, [eventsList]);

  const filteredEvents = useMemo(() => {
    return eventsList.filter(evt => {
      const matchesSearch = !searchQuery || 
        evt.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        evt.venue.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = selectedCity === 'all' || evt.city === selectedCity;
      return matchesSearch && matchesCity;
    });
  }, [eventsList, searchQuery, selectedCity]);

  const totalActiveListings = useMemo(() => {
    return eventsList.reduce((acc, e) => acc + (e.activeListings || 0), 0);
  }, [eventsList]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          100% Verified Fan-to-Fan Marketplace
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Fair-Price Fan Resale Hub
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Buy authentic tickets directly from verified fans. Every trade permanently revokes the seller's barcode and generates a brand-new cryptographic pass in your vault.
        </p>

        {/* Protection Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
          <div className="bg-card border rounded-xl p-3.5 flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Anti-Scalping Cap</p>
              <p className="text-[11px] text-muted-foreground">Price capped strictly at ≤110% of face value.</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-3.5 flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Atomic Re-Issuance</p>
              <p className="text-[11px] text-muted-foreground">Zero counterfeit risk. Immediate ticket transfer.</p>
            </div>
          </div>
          <div className="bg-card border rounded-xl p-3.5 flex items-start gap-3">
            <Store className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Instant Wallet Payout</p>
              <p className="text-[11px] text-muted-foreground">Funds settle directly to your Encore Wallet.</p>
            </div>
          </div>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/resale/my-listings">
            <Button variant="outline" size="sm">
              <Tag className="w-3.5 h-3.5 mr-1.5" /> My Active Listings
            </Button>
          </Link>
          <Link href="/resale/my-trades">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> My Trade Settlements
            </Button>
          </Link>
          <Link href="/tickets">
            <Button variant="primary" size="sm">
              <Store className="w-3.5 h-3.5 mr-1.5" /> Sell From My Vault
            </Button>
          </Link>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              className="pl-10 h-10 text-sm rounded-xl shadow-sm" 
              placeholder="Search by event or venue..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
            <Button
              size="sm"
              variant={selectedCity === 'all' ? 'primary' : 'outline'}
              className="rounded-full text-xs h-8 px-3"
              onClick={() => setSelectedCity('all')}
            >
              All Cities
            </Button>
            {cities.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={selectedCity === c ? 'primary' : 'outline'}
                className="rounded-full text-xs h-8 px-3"
                onClick={() => setSelectedCity(c)}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Showing <strong>{filteredEvents.length}</strong> events with active fan listings</span>
          <span><strong>{totalActiveListings}</strong> total authenticated tickets available</span>
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 px-4 bg-muted/15 border border-dashed rounded-2xl space-y-3">
          <Tag className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <h3 className="font-semibold text-base">No resale listings match your filter</h3>
          <p className="text-xs text-muted-foreground">Try clearing your search query or selecting All Cities.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCity('all'); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => (
            <Card 
              key={evt.id} 
              className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/80 hover:border-primary/50 group flex flex-col justify-between"
              onClick={() => router.push(`/resale/events/${evt.id}`)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-semibold">
                    Verified
                  </Badge>
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {evt.activeListings} {evt.activeListings === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">
                    {evt.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{evt.venue}</span>
                  </p>
                  {evt.startsAt && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{new Date(evt.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-border/50 flex items-center justify-between text-xs">
                {evt.minPriceCents ? (
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block font-medium">Starting from</span>
                    <span className="font-bold text-sm text-foreground">
                      ${(evt.minPriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">Market verified</span>
                )}
                <span className="text-primary font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  View Tickets <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
