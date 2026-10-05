'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Compass, Ticket, ArrowRight } from 'lucide-react';

export default function OnboardingCompletePage() {
  const [profileName, setProfileName] = useState('Alex Turner');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem('onboarding_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.displayName) setProfileName(parsed.displayName);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-display font-bold">You&apos;re All Set, {profileName}!</h1>
        <p className="text-body text-muted max-w-md mx-auto">
          Your attendee profile has been initialized with verified ticketing privileges, hold timers, and resale access.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60 text-left">
        <CardHeader>
          <CardTitle>What would you like to do first?</CardTitle>
          <CardDescription>
            Choose an entry point to begin using Encore.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/explore"
            className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface/80 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-body group-hover:text-primary transition-colors">
                  Explore Upcoming Events
                </h4>
                <p className="text-caption text-muted">
                  Discover arena concerts, view seating layouts, and hold tickets.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors" />
          </Link>

          <Link
            href="/tickets"
            className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-surface/50 hover:bg-surface/80 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-body group-hover:text-secondary transition-colors">
                  View Ticket Wallet
                </h4>
                <p className="text-caption text-muted">
                  Access your digital pass collection, QR codes, and resale listings.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted group-hover:text-secondary transition-colors" />
          </Link>
        </CardContent>
        <CardFooter className="pt-2">
          <Link href="/" className="w-full">
            <Button variant="primary" className="w-full gap-2">
              Go to Encore Home <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}
