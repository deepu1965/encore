'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, ShieldCheck, Ticket, Users } from 'lucide-react';

export default function OnboardingWelcomePage() {
  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-caption font-medium">
          <Sparkles className="w-3.5 h-3.5" /> Welcome to Encore V1.5
        </div>
        <h1 className="text-display font-bold">Get started with Encore</h1>
        <p className="text-body text-muted max-w-md mx-auto">
          The next-generation live events and fair ticketing platform with zero scalping, cryptographic ticket security, and real-time seat maps.
        </p>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Welcome to your onboarding</CardTitle>
          <CardDescription>
            Let&apos;s personalize your experience in 3 simple steps:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-border/40">
            <div className="p-2 rounded-md bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-body">1. Choose your account role</h4>
              <p className="text-caption text-muted">Join as a fan and ticket buyer or as an event organizer.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-border/40">
            <div className="p-2 rounded-md bg-secondary/10 text-secondary">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-body">2. Set up your profile & preferences</h4>
              <p className="text-caption text-muted">Pick your favorite music genres, sports, and city.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-border/40">
            <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-body">3. Enter the platform</h4>
              <p className="text-caption text-muted">Instant access to verified digital tickets and verified event catalogs.</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-2">
          <Link href="/explore">
            <Button variant="ghost">Skip for now</Button>
          </Link>
          <Link href="/onboarding/role">
            <Button variant="primary" className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </section>
  );
}
