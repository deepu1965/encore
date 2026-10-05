'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/shared/event-card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useEvents } from '@/features/discovery/queries';
import { useSession } from '@/features/auth/queries';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Ticket,
  Clock,
  RefreshCw,
  Building2,
  Lock,
  Layers,
  MapPin,
  Music,
  Trophy,
  Smile,
  Drama,
  Utensils,
  Cpu,
  CheckCircle2,
} from 'lucide-react';

const CATEGORIES = [
  { label: 'Live Music', icon: Music, query: 'Music', bg: 'from-purple-500/20 to-pink-500/10' },
  { label: 'Stadium Sports', icon: Trophy, query: 'Sports', bg: 'from-blue-500/20 to-cyan-500/10' },
  { label: 'Stand-up Comedy', icon: Smile, query: 'Comedy', bg: 'from-amber-500/20 to-orange-500/10' },
  { label: 'Theater & Broadway', icon: Drama, query: 'Theater', bg: 'from-rose-500/20 to-red-500/10' },
  { label: 'Food & Festivals', icon: Utensils, query: 'Festival', bg: 'from-emerald-500/20 to-teal-500/10' },
  { label: 'Tech & Summits', icon: Cpu, query: 'Conference', bg: 'from-indigo-500/20 to-cyan-500/10' },
];

const CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Goa',
  'Kochi',
];

const POPULAR_VENUES = [
  { name: 'Narendra Modi Stadium', city: 'Ahmedabad', capacity: '132,000 capacity', type: 'Cricket & Mega Shows' },
  { name: 'M. Chinnaswamy Stadium', city: 'Bengaluru', capacity: '40,000 capacity', type: 'Stadium Sports & Concerts' },
  { name: 'Wankhede Stadium', city: 'Mumbai', capacity: '33,000 capacity', type: 'Cricket & World Tours' },
  { name: 'NMACC Grand Theatre', city: 'Mumbai', capacity: '2,000 capacity', type: 'Broadway & Musicals' },
  { name: 'Vagator Festival Grounds', city: 'Goa', capacity: '35,000 capacity', type: 'Outdoor Music Festivals' },
  { name: 'Encore Arena', city: 'Hyderabad', capacity: '15,000 capacity', type: 'Flagship Arena & Esports' },
];

export default function HomePage() {
  const { data: events, isLoading, error } = useEvents();
  const { data: session } = useSession();

  // Featured events = first 6
  const featuredEvents = events?.slice(0, 6) ?? [];
  const trendingEvents = events?.slice(6, 12) ?? [];

  return (
    <div className="flex flex-col gap-16 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-card/80 via-card/40 to-background p-8 md:p-14 text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-caption font-medium">
          <Sparkles className="w-3.5 h-3.5" /> Next-Generation Ticketing Infrastructure
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto">
          Fair, Scalable &amp; Instant Live Event Ticketing
        </h1>

        <p className="text-body text-muted max-w-2xl mx-auto text-base md:text-lg">
          Encore solves flash-sale congestion with high-throughput virtual waiting rooms,
          strict 10-minute seat holds, cryptographic QR ticket passes, and fair price-capped resale.
        </p>

        {/* Dynamic CTAs */}
        <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
          {session ? (
            <>
              <Link href="/explore">
                <Button variant="primary" size="lg" className="gap-2">
                  Explore Events <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/tickets">
                <Button variant="outline" size="lg" className="gap-2">
                  <Ticket className="w-4 h-4" /> My Ticket Wallet
                </Button>
              </Link>
              {(session.role === 'ADMIN' || session.role === 'OPERATIONS') && (
                <Link href="/ops">
                  <Button variant="secondary" size="lg" className="gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-500/50 shadow-sm">
                    <ShieldCheck className="w-4 h-4" /> Operations Console
                  </Button>
                </Link>
              )}
              {session.role === 'ORGANIZER' && (
                <Link href="/organizer/events">
                  <Button variant="secondary" size="lg" className="gap-2">
                    <Building2 className="w-4 h-4" /> Organizer Console
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/explore">
                <Button variant="primary" size="lg" className="gap-2">
                  Explore Events <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="secondary" size="lg" className="gap-2">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Platform Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-border/40 max-w-4xl mx-auto">
          <div className="text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold text-foreground">125+</div>
            <div className="text-caption text-muted">Curated Live Events</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold text-foreground">38</div>
            <div className="text-caption text-muted">Iconic Indian Venues</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold text-foreground">15</div>
            <div className="text-caption text-muted">Metropolitan Cities</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-2xl md:text-3xl font-bold text-emerald-400">100%</div>
            <div className="text-caption text-muted">Anti-Scalp Verification</div>
          </div>
        </div>
      </section>

      {/* Explore by Category */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-bold">Browse by Category</h2>
            <p className="text-caption text-muted">Find unforgettable experiences tailored to your passion</p>
          </div>
          <Link href="/explore" className="text-label text-primary hover:underline font-medium">
            View all categories →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.label}
                href={`/explore?category=${cat.query}`}
                className="group p-4 rounded-xl border border-border/50 bg-card/40 hover:bg-card/80 transition-all text-center space-y-2"
              >
                <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-caption font-semibold text-foreground">{cat.label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Explore by City */}
      <section className="space-y-4">
        <div>
          <h2 className="text-h2 font-bold">Discover Events Near You</h2>
          <p className="text-caption text-muted">Live entertainment across India’s premier cultural hubs</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CITIES.map((city) => (
            <Link
              key={city}
              href={`/explore?city=${encodeURIComponent(city)}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border/60 bg-card/50 text-caption font-medium hover:border-primary hover:text-primary transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-muted" />
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Value Pillars: Trust, Security, Performance */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-h3 font-semibold">Zero Scalping &amp; Price Caps</h3>
          <p className="text-caption text-muted leading-relaxed">
            Resale tickets are strictly price-capped at 110% of face value with automated two-phase escrow settlement and organizer royalties.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-h3 font-semibold">Virtual Waiting Room</h3>
          <p className="text-caption text-muted leading-relaxed">
            High-concurrency token bucket admission absorbs 100,000+ concurrent fan requests with real-time queue position streaming.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-border/50 bg-card/40 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-h3 font-semibold">Idempotent Checkout</h3>
          <p className="text-caption text-muted leading-relaxed">
            Guaranteed single-charge idempotency keys with distributed lock orchestration across PostgreSQL and Redis clusters.
          </p>
        </div>
      </section>

      {/* Featured Events Catalog */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-h2 font-semibold">Featured Live Events</h2>
            <p className="text-caption text-muted">Trending shows on sale now</p>
          </div>
          <Link href="/explore" className="text-label text-primary hover:underline font-medium">
            View all events →
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {error && (
          <EmptyState
            title="Unable to load events"
            description="The gateway was temporarily unreachable. Please retry."
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        )}

        {!isLoading && !error && featuredEvents.length === 0 && (
          <EmptyState
            title="No events scheduled"
            description="Check back shortly for new event announcements."
          />
        )}

        {!isLoading && !error && featuredEvents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredEvents.map((event) => (
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
        )}
      </section>

      {/* Trending Events Catalog */}
      {trendingEvents.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-h2 font-semibold">Trending This Month</h2>
              <p className="text-caption text-muted">High-demand tours with fast-selling inventory</p>
            </div>
            <Link href="/explore" className="text-label text-primary hover:underline font-medium">
              Explore catalog →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingEvents.map((event) => (
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
        </section>
      )}

      {/* Iconic Venues Showcase */}
      <section className="space-y-6">
        <div>
          <h2 className="text-h2 font-bold">Featured Arenas &amp; Stadiums</h2>
          <p className="text-caption text-muted">World-class venues equipped with Encore digital access control</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POPULAR_VENUES.map((venue) => (
            <div
              key={venue.name}
              className="p-5 rounded-xl border border-border/50 bg-card/40 space-y-2 hover:border-border transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {venue.city}
                </span>
                <span className="text-xs text-muted">{venue.capacity}</span>
              </div>
              <h4 className="font-bold text-body text-foreground">{venue.name}</h4>
              <p className="text-caption text-muted">{venue.type}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-h2 font-bold">How Encore Works</h2>
          <p className="text-caption text-muted max-w-lg mx-auto">
            From discovering arena tours to entering the venue with rotating dynamic barcodes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-lg border border-border/40 bg-card/30 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Step 1</div>
            <h4 className="font-semibold text-body">Discover &amp; Queue</h4>
            <p className="text-caption text-muted">
              Browse tours and join fair virtual waiting rooms with live queue admission tokens.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/40 bg-card/30 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Step 2</div>
            <h4 className="font-semibold text-body">Select &amp; Hold</h4>
            <p className="text-caption text-muted">
              Pick your exact seats on interactive SVG maps with an authoritative 10-minute hold lock.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/40 bg-card/30 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Step 3</div>
            <h4 className="font-semibold text-body">Idempotent Pay</h4>
            <p className="text-caption text-muted">
              Checkout securely with credit card or wallet balance with zero risk of duplicate debits.
            </p>
          </div>

          <div className="p-5 rounded-lg border border-border/40 bg-card/30 space-y-2">
            <div className="text-xs font-bold text-primary uppercase tracking-wider">Step 4</div>
            <h4 className="font-semibold text-body">Passes &amp; Resale</h4>
            <p className="text-caption text-muted">
              Access dynamic QR passes in your ticket wallet, or resell safely on the official peer-to-peer exchange.
            </p>
          </div>
        </div>
      </section>

      {/* Organizer Callout */}
      <section className="p-8 rounded-xl border border-secondary/30 bg-secondary/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-secondary text-caption font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> For Promoters &amp; Venue Managers
          </div>
          <h3 className="text-2xl font-bold">Host Your Next Event on Encore</h3>
          <p className="text-caption text-muted max-w-xl">
            Create multi-tier stadium seating layouts, configure automated flash-sale waiting rooms,
            and monitor live gross revenue settlement in real-time.
          </p>
        </div>
        <Link href="/organizer/onboarding">
          <Button variant="secondary" size="lg" className="whitespace-nowrap gap-2">
            Organizer Portal <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>
    </div>
  );
}
