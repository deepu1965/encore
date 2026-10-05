'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, ShieldCheck, ArrowRight, ArrowLeft, BarChart3 } from 'lucide-react';

export default function OrganizerOnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('Encore Live Entertainment');
  const [taxId, setTaxId] = useState('EIN-98-7654321');
  const [venueCapacity, setVenueCapacity] = useState('25000');
  const [contactEmail, setContactEmail] = useState('organizer@encore.live');

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('organizer_org', JSON.stringify({ orgName, taxId, venueCapacity, contactEmail }));
      // Set mock role to ORGANIZER so middleware allows immediate entry
      document.cookie = 'mock_role=ORGANIZER; path=/; max-age=86400';
    }
    router.push('/organizer/events');
  };

  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-caption font-medium">
          <Building2 className="w-3.5 h-3.5" /> Organizer Verification & Setup
        </div>
        <h1 className="text-display font-bold">Set Up Your Production Organization</h1>
        <p className="text-body text-muted">
          Configure your legal entity details, primary venues, and ticketing payout preferences.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <form onSubmit={handleComplete}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-secondary" /> Organization Profile
            </CardTitle>
            <CardDescription>
              Verified organizer details are required for event publishing, flash-sale waiting rooms, and revenue payouts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              id="org-name"
              label="Organization / Production Company Name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Live Nation / Encore Productions"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                id="org-tax"
                label="Tax Identification Number (EIN / VAT)"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="XX-XXXXXXX"
                required
              />
              <Input
                id="org-capacity"
                label="Expected Venue Capacity"
                type="number"
                value={venueCapacity}
                onChange={(e) => setVenueCapacity(e.target.value)}
                placeholder="e.g. 20000"
                required
              />
            </div>
            <Input
              id="org-email"
              label="Production Contact Email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="ops@yourcompany.com"
              required
            />
          </CardContent>
          <CardFooter className="flex justify-between pt-4">
            <Link href="/onboarding/role">
              <Button type="button" variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            <Button type="submit" variant="primary" className="gap-2 bg-secondary hover:bg-secondary/90 text-white">
              Launch Organizer Console <ArrowRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </form>
      </Card>
    </section>
  );
}
