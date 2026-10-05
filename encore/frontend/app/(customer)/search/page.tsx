'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { Search } from '@/components/ui/search';
import { EventCard } from '@/components/shared/event-card';
import { VenueCard } from '@/components/shared/venue-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useSearch, useAutocomplete } from '@/features/discovery/queries';
import type { AutocompleteResult } from '@/features/discovery/types';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce query for search (500ms target)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: searchResults, isLoading: isSearching } = useSearch(debouncedQuery);
  const { data: autocompleteResults } = useAutocomplete(query);

  const handleAutocompleteSelect = (result: AutocompleteResult) => {
    setShowAutocomplete(false);
    setQuery(result.name);
    if (result.type === 'event') {
      router.push(`/events/${result.id}`);
    } else if (result.type === 'venue') {
      router.push(`/venues/${result.id}`);
    }
  };

  const events = searchResults?.events ?? [];
  const venues = searchResults?.venues ?? [];
  const hasResults = events.length > 0 || venues.length > 0;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-h1 font-bold">Search</h1>
        <p className="text-body text-muted mt-1">
          Find events, venues, and artists.
        </p>
      </header>

      {/* Search Input with Autocomplete */}
      <div ref={searchRef} className="relative max-w-xl">
        <Search
          placeholder="Search for events, venues, or artists..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowAutocomplete(true);
          }}
          onFocus={() => setShowAutocomplete(true)}
        />

        {/* Autocomplete Dropdown */}
        {showAutocomplete && query.length >= 2 && autocompleteResults && autocompleteResults.length > 0 && (
          <div role="listbox" className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-lg max-h-80 overflow-auto">
            {autocompleteResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                role="option"
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface text-left"
                onClick={() => handleAutocompleteSelect(result)}
              >
                <span className="text-caption text-muted uppercase">{result.type}</span>
                <span className="text-body text-foreground">{result.name}</span>
                {result.subtitle && (
                  <span className="text-caption text-muted">{result.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Results */}
      {debouncedQuery.length >= 2 && (
        <div className="space-y-8">
          {isSearching && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {!isSearching && !hasResults && (
            <EmptyState
              title="No results found"
              description={`No events or venues found for "${debouncedQuery}".`}
            />
          )}

          {!isSearching && hasResults && (
            <>
              {/* Events */}
              {events.length > 0 && (
                <div>
                  <h2 className="text-h3 font-semibold mb-4">
                    Events ({searchResults?.totalEvents ?? 0})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((event) => (
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
                </div>
              )}

              {/* Venues */}
              {venues.length > 0 && (
                <div>
                  <h2 className="text-h3 font-semibold mb-4">
                    Venues ({searchResults?.totalVenues ?? 0})
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {venues.map((venue) => (
                      <VenueCard
                        key={venue.id}
                        id={venue.id}
                        name={venue.name}
                        city={venue.city}
                        state={venue.state}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state before search */}
      {debouncedQuery.length < 2 && (
        <div className="text-center py-12">
          <p className="text-body text-muted">
            Enter at least 2 characters to search.
          </p>
        </div>
      )}
    </section>
  );
}
