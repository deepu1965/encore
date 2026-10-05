'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useVenues } from '@/features/discovery/queries';
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  Search, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function VenuesDirectoryPage() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: venues, isLoading, error } = useVenues(selectedCity);

  const cities = [
    'all',
    'Ahmedabad',
    'Bengaluru',
    'Chennai',
    'Delhi',
    'Hyderabad',
    'Kolkata',
    'Mumbai',
  ];

  const filteredVenues = useMemo(() => {
    if (!venues) return [];
    return venues.filter((v: any) => {
      const matchesSearch = !searchQuery || 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = selectedCity === 'all' || v.city.toLowerCase() === selectedCity.toLowerCase();
      return matchesSearch && matchesCity;
    });
  }, [venues, searchQuery, selectedCity]);

  const totalCapacity = useMemo(() => {
    if (!venues) return 0;
    return venues.reduce((acc: number, v: any) => acc + (v.capacity || 25000), 0);
  }, [venues]);

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-border/40 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Official Venue Directory & Seating Maps
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            World-Class Arenas & Iconic Stadiums
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Explore premier live-event destinations across India. Browse interactive section seating charts, high-resolution maps, and upcoming tour dates.
          </p>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-white/10 max-w-xl">
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              {venues ? venues.length : '35+'}
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-0.5">
              Partner Venues
            </p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
              {totalCapacity > 0 ? (totalCapacity / 1000).toFixed(0) + 'k+' : '500k+'}
            </p>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-0.5">
              Live Capacity
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">100%</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-0.5">
              Reserved Seating
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* City Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            {cities.map((city) => (
              <Button
                key={city}
                size="sm"
                variant={selectedCity === city ? 'primary' : 'outline'}
                onClick={() => setSelectedCity(city)}
                className="capitalize text-xs font-semibold shrink-0 h-8"
              >
                {city === 'all' ? 'All Metros' : city}
              </Button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stadiums, arenas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Showing <strong>{filteredVenues.length}</strong> authenticated venue locations</span>
          <span className="hidden sm:inline">Real-time seat telemetry enabled</span>
        </div>
      </div>

      {/* Venues Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Could not load venues"
          description="Failed to connect to the venue directory. Please check your connection."
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      ) : filteredVenues.length === 0 ? (
        <div className="text-center py-16 px-4 bg-muted/15 border border-dashed rounded-2xl space-y-3">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-bold text-base">No venues found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No venues match your current city filter or search query.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedCity('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue: any) => (
            <Link key={venue.id} href={`/venues/${venue.id}`} className="group block h-full">
              <Card className="h-full overflow-hidden border border-border/70 hover:border-primary/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-1 bg-card">
                {/* Image & Header */}
                <div>
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    {venue.image_url || venue.imageUrl ? (
                      <img
                        src={venue.image_url || venue.imageUrl}
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-indigo-950 text-slate-500">
                        <Building2 className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-black/60 backdrop-blur border border-white/20 text-white text-[11px] font-semibold">
                        <MapPin className="w-3 h-3 mr-1 text-emerald-400" />
                        {venue.city}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h2 className="text-lg font-bold text-white leading-snug drop-shadow-sm group-hover:text-primary-foreground transition-colors">
                        {venue.name}
                      </h2>
                    </div>
                  </div>

                  {/* Metadata Body */}
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {venue.address || `${venue.name}, ${venue.city}, India`}
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>Capacity: <strong>{(venue.capacity || 25000).toLocaleString()}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                        <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                        <span>
                          <strong>{venue.upcoming_events_count ?? 1}</strong> {venue.upcoming_events_count === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 pt-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary group-hover:underline flex items-center gap-1">
                    Explore Seating & Events
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
