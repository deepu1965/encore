'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EventCard } from '@/components/shared/event-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { FilterPanel, FilterGroup } from '@/components/shared/filter-panel';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useInfiniteEvents } from '@/features/discovery/queries';
import { Search, Filter, X, Sparkles, MapPin } from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'MUSIC', label: 'Music' },
  { id: 'SPORTS', label: 'Sports' },
  { id: 'COMEDY', label: 'Comedy' },
  { id: 'THEATER', label: 'Theater' },
  { id: 'FESTIVAL', label: 'Festivals & Food' },
  { id: 'CONFERENCE', label: 'Tech & Summits' },
];

const CITIES = [
  { value: 'ALL', label: 'All Cities' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi NCR' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Jaipur', label: 'Jaipur' },
  { value: 'Goa', label: 'Goa' },
  { value: 'Kochi', label: 'Kochi' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Lucknow', label: 'Lucknow' },
];

const STATUSES = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ON_SALE', label: 'On Sale' },
  { value: 'SOLD_OUT', label: 'Sold Out' },
  { value: 'SCHEDULED', label: 'Coming Soon' },
];

const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Date: Soonest First' },
  { value: 'date_desc', label: 'Date: Latest First' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category')?.toUpperCase() ?? 'ALL';
  const initialCity = searchParams.get('city') ?? 'ALL';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedSort, setSelectedSort] = useState('date_asc');

  const LIMIT = 36;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEvents(LIMIT);

  // Flatten infinite query pages
  const allEvents = useMemo(() => {
    return data?.pages.flatMap((p) => p.events) ?? [];
  }, [data]);

  // Client-side filtering & sorting
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((ev) => {
        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = ev.name.toLowerCase().includes(q);
          const matchVenue = (ev.venueName ?? '').toLowerCase().includes(q);
          const matchCity = (ev.city ?? '').toLowerCase().includes(q);
          if (!matchName && !matchVenue && !matchCity) return false;
        }

        // City filter
        if (selectedCity !== 'ALL') {
          if ((ev.city ?? '').toLowerCase() !== selectedCity.toLowerCase()) {
            return false;
          }
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if (ev.status !== selectedStatus) return false;
        }

        // Category filter (keyword matching on name/description)
        if (selectedCategory !== 'ALL') {
          const text = `${ev.name} ${ev.description ?? ''}`.toLowerCase();
          if (selectedCategory === 'MUSIC') {
            if (!text.match(/music|concert|tour|symphony|acoustic|song|orchestra|dj|band|singer|rock|pop|hip-hop/i)) {
              return false;
            }
          } else if (selectedCategory === 'SPORTS') {
            if (!text.match(/ipl|cricket|fc|football|match|tournament|league|stadium|cup|badminton|tennis|esports|kabaddi|racing/i)) {
              return false;
            }
          } else if (selectedCategory === 'COMEDY') {
            if (!text.match(/comedy|stand-up|comic|laugh|humor|show/i)) {
              return false;
            }
          } else if (selectedCategory === 'THEATER') {
            if (!text.match(/theater|musical|broadway|drama|play|opera|cirque/i)) {
              return false;
            }
          } else if (selectedCategory === 'FESTIVAL') {
            if (!text.match(/festival|carnival|food|fest|art|beer/i)) {
              return false;
            }
          } else if (selectedCategory === 'CONFERENCE') {
            if (!text.match(/conference|summit|tech|developer|conclave|saas|fintech|design/i)) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'date_asc') {
          return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
        }
        if (selectedSort === 'date_desc') {
          return new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
        }
        if (selectedSort === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (selectedSort === 'name_desc') {
          return b.name.localeCompare(a.name);
        }
        return 0;
      });
  }, [allEvents, searchQuery, selectedCity, selectedStatus, selectedCategory, selectedSort]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'ALL' ||
    selectedCity !== 'ALL' ||
    selectedStatus !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedCity('ALL');
    setSelectedStatus('ALL');
  };

  return (
    <section className="flex flex-col gap-8">
      {/* Header with Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-h1 font-bold">Explore events</h1>
            <p className="text-body text-muted mt-1">
              Discover verified arena concerts, major leagues, theatrical performances, and festivals across India.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event, artist or city..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-caption font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card/60 border border-border/50 text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Grid */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <FilterPanel className="lg:w-64 shrink-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-body">
              <Filter className="w-4 h-4 text-primary" /> Filters
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-primary hover:underline font-medium"
              >
                Reset all
              </button>
            )}
          </div>

          {/* City Filter */}
          <FilterGroup label="City">
            <Select
              options={CITIES}
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              placeholder="Select City"
            />
          </FilterGroup>

          {/* Status Filter */}
          <FilterGroup label="Availability">
            <Select
              options={STATUSES}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              placeholder="Select Status"
            />
          </FilterGroup>

          {/* Sort Filter */}
          <FilterGroup label="Sort By">
            <Select
              options={SORT_OPTIONS}
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              placeholder="Sort By"
            />
          </FilterGroup>

          <div className="p-4 rounded-lg border border-border/40 bg-card/20 space-y-2">
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Fair Ticketing Notice
            </div>
            <p className="text-caption text-muted leading-relaxed">
              Every event on Encore is protected by official anti-scalp guarantees with strict price-capped resale rules.
            </p>
          </div>
        </FilterPanel>

        {/* Event Grid Area */}
        <div className="flex-1">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {error && (
            <EmptyState
              title="Unable to load events"
              description="Something went wrong while connecting to the event catalog. Please try again."
              action={{ label: 'Retry', onClick: () => window.location.reload() }}
            />
          )}

          {!isLoading && !error && filteredEvents.length === 0 && (
            <EmptyState
              title="No events match your criteria"
              description="Try adjusting your filters or resetting your search term."
              action={
                hasActiveFilters
                  ? { label: 'Reset filters', onClick: resetFilters }
                  : undefined
              }
            />
          )}

          {!isLoading && !error && filteredEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-caption text-muted font-medium">
                  Showing <span className="text-foreground font-semibold">{filteredEvents.length}</span> live events
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    name={event.name}
                    venueName={event.venueName ?? 'Venue TBD'}
                    startsAt={event.startsAt}
                    status={event.status}
                    posterImageUrl={event.posterImageUrl}
                    minPriceCents={event.minPriceCents}
                  />
                ))}
              </div>

              {hasNextPage && (
                <div className="mt-10 text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="min-w-48"
                  >
                    {isFetchingNextPage ? 'Loading more...' : 'Load more events'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto py-16 px-4 text-center animate-pulse text-muted-foreground">Loading explore events...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
