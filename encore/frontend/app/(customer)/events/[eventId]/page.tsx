'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const VenueMap = dynamic(() => import('@/components/shared/venue-map').then(m => m.VenueMap), { 
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>
});

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useEvent } from '@/features/discovery/queries';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  QrCode,
  MessageSquare,
  Share2,
  Ticket,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Coming soon',
  ON_SALE: 'On sale',
  SOLD_OUT: 'Sold out',
  CANCELLED: 'Cancelled',
};

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  SCHEDULED: 'default',
  ON_SALE: 'success',
  SOLD_OUT: 'warning',
  CANCELLED: 'error',
};

function getTicketTiers(minPriceCents?: number) {
  const base = minPriceCents || 8000;
  return [
    { name: 'VIP Lounge & Pit', price: `$${((base * 3) / 100).toFixed(2)}`, perks: 'Fast-track gate, dedicated bar, prime stage view' },
    { name: 'Premium Stalls', price: `$${((base * 2) / 100).toFixed(2)}`, perks: 'Reserved tier seating, excellent elevated sightline' },
    { name: 'Gold General', price: `$${((base * 1.5) / 100).toFixed(2)}`, perks: 'Central arena view, unobstructed acoustics' },
    { name: 'Silver Upper', price: `$${((base * 1.2) / 100).toFixed(2)}`, perks: 'Grandstand seated access, full panoramic view' },
    { name: 'Standard General Admission', price: `$${(base / 100).toFixed(2)}`, perks: 'Entry pass with access to outer pavilion' },
  ];
}

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;
  const [copied, setCopied] = useState(false);

  const { data: event, isLoading, error } = useEvent(eventId);

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-72 w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-1/4" />
        </div>
      </section>
    );
  }

  if (error || !event) {
    return (
      <EmptyState
        title="Event not found"
        description="This event doesn't exist or has been removed."
        action={{ label: 'Browse events', onClick: () => router.push('/explore') }}
      />
    );
  }

  const eventDate = new Date(event.startsAt);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const canBuyTickets = event.status === 'ON_SALE' || event.status === 'SCHEDULED';

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="space-y-8 max-w-6xl mx-auto">
      {/* Event Banner */}
      <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden bg-surface border border-border/40">
        {event.posterImageUrl ? (
          <Image
            src={event.posterImageUrl}
            alt={event.name}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-muted">
            <div className="text-center space-y-2">
              <Ticket className="w-12 h-12 mx-auto text-primary/40" />
              <div className="text-body font-medium">{event.name}</div>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
        
        <Badge variant={statusVariant[event.status]} className="absolute top-4 right-4 text-sm px-3 py-1">
          {statusLabel[event.status]}
        </Badge>

        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight drop-shadow-md">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
              <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <Calendar className="w-4 h-4 text-primary" /> {formattedDate}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                <Clock className="w-4 h-4 text-primary" /> {formattedTime}
              </span>
              {event.venueName && (
                <span className="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                  <MapPin className="w-4 h-4 text-primary" /> {event.venueName} ({event.city ?? 'India'})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Layout: Content & Action Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details, Description, Tiers, Location */}
        <div className="lg:col-span-2 space-y-6">
          {/* About Event */}
          <Card className="p-6 space-y-3">
            <h2 className="text-h3 font-bold">About the Event</h2>
            <p className="text-body text-muted leading-relaxed whitespace-pre-wrap">
              {event.description ||
                'Experience world-class live performance with state-of-the-art acoustics, high-density light sequencing, and verified digital admission on Encore.'}
            </p>
          </Card>

          {/* Ticket Tier Pricing Breakdown */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-h3 font-bold">Ticket Categories &amp; Pricing</h2>
              <span className="text-caption text-muted">All prices inclusive of taxes</span>
            </div>

            <div className="divide-y divide-border/40">
              {getTicketTiers(event.minPriceCents).map((tier) => (
                <div key={tier.name} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-body text-foreground">{tier.name}</div>
                    <div className="text-caption text-muted">{tier.perks}</div>
                  </div>
                  <div className="font-bold text-body text-foreground">{tier.price}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Event Policies & Protection Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5 space-y-2 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-caption">
                <ShieldCheck className="w-4 h-4" /> 100% Anti-Scalp Protection
              </div>
              <p className="text-caption text-muted">
                Official resale is strictly price-capped at max 110% of face value with automated escrow settlement.
              </p>
            </Card>

            <Card className="p-5 space-y-2 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 text-primary font-semibold text-caption">
                <QrCode className="w-4 h-4" /> Dynamic Rotating QR Passes
              </div>
              <p className="text-caption text-muted">
                Tickets refresh cryptographically every 30 seconds to prevent screenshots and unauthorized duplication.
              </p>
            </Card>
          </div>

          {/* Location & Map */}
          {event.venueName && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-h3 font-bold">Venue &amp; Location</h3>
                  <p className="text-caption text-muted">{event.venueName}, {event.city ?? 'India'}</p>
                </div>
                {event.venueId && (
                  <Link href={`/venues/${event.venueId}`} className="text-label text-primary hover:underline font-medium">
                    View venue details →
                  </Link>
                )}
              </div>
              <VenueMap lat={17.3850} lng={78.4867} venueName={event.venueName} />
            </Card>
          )}
        </div>

        {/* Right Column: Checkout Card & Quick Actions */}
        <div className="space-y-6">
          <Card className="p-6 space-y-5 sticky top-20 border-primary/30">
            <div className="space-y-1">
              <span className="text-caption text-muted">Starting from</span>
              <div className="text-3xl font-extrabold text-foreground">
                {event.minPriceCents ? `$${(event.minPriceCents / 100).toFixed(2)}` : '$80.00'}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {canBuyTickets && (
                <Link href={`/events/${eventId}/select-seats`} className="block w-full">
                  <Button variant="primary" size="lg" className="w-full font-bold">
                    Buy tickets
                  </Button>
                </Link>
              )}

              {event.status === 'SOLD_OUT' && (
                <div className="space-y-2">
                  <Button variant="outline" size="lg" className="w-full" disabled>
                    Sold out
                  </Button>
                  <Link href={`/resale/events/${eventId}`} className="block w-full">
                    <Button variant="secondary" size="md" className="w-full gap-2">
                      <Sparkles className="w-4 h-4" /> Check Resale Marketplace
                    </Button>
                  </Link>
                </div>
              )}

              {event.status === 'CANCELLED' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-caption font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  This event has been cancelled. Automatic refunds have been credited.
                </div>
              )}

              <Link href={`/events/${eventId}/chat`} className="block w-full">
                <Button variant="outline" size="md" className="w-full gap-2">
                  <MessageSquare className="w-4 h-4" /> Attendee Chat Room
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="md"
                onClick={handleShare}
                className="w-full gap-2"
              >
                <Share2 className="w-4 h-4" /> {copied ? 'Link Copied!' : 'Share Event'}
              </Button>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-2 text-xs text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authoritative 10-min seat holding</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant UPI &amp; card payment clearance</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Direct wallet proceeds on verified resale</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
