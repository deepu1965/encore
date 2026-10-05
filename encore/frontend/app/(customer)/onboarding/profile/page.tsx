'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, UserCheck } from 'lucide-react';

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('Alex Turner');
  const [city, setCity] = useState('San Francisco, CA');
  const [bio, setBio] = useState('Concert enthusiast and indie rock fan.');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_profile', JSON.stringify({ displayName, city, bio }));
    }
    router.push('/onboarding/preferences');
  };

  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display font-bold">Step 2: Profile Setup</h1>
        <p className="text-body text-muted">
          Set up your public attendee profile for tickets and community features.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <form onSubmit={handleContinue}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" /> Basic Information
            </CardTitle>
            <CardDescription>
              This name will appear on your digital ticket passes and order receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="profile-name"
              label="Full Name / Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Turner"
              required
            />
            <Input
              id="profile-city"
              label="Location / Home City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. London, UK or New York, NY"
            />
            <div className="space-y-1.5">
              <label htmlFor="profile-bio" className="text-label font-medium text-foreground">
                Short Bio (Optional)
              </label>
              <textarea
                id="profile-bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Tell artists and fans a little about yourself"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <Link href="/onboarding/role">
              <Button type="button" variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button type="submit" variant="primary" className="gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
