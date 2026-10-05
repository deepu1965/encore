'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, Check, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingRolePage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'ORGANIZER'>('CUSTOMER');

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_role', selectedRole);
    }
    if (selectedRole === 'ORGANIZER') {
      router.push('/organizer/onboarding');
    } else {
      router.push('/onboarding/profile');
    }
  };

  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display font-bold">Step 1: Choose Your Role</h1>
        <p className="text-body text-muted">
          Tell us how you plan to use Encore so we can tailor your workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fan / Customer Card */}
        <div
          onClick={() => setSelectedRole('CUSTOMER')}
          className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col justify-between space-y-4 ${
            selectedRole === 'CUSTOMER'
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-h3 font-semibold">Event Goer & Fan</h3>
            <p className="text-caption text-muted">
              Discover concerts, reserve seats on real-time interactive maps, store dynamic QR tickets, and safely resell tickets with price caps.
            </p>
          </div>
          <div className="flex items-center gap-2 text-label font-medium text-primary">
            {selectedRole === 'CUSTOMER' && <Check className="w-4 h-4" />}
            <span>Selected as Fan</span>
          </div>
        </div>

        {/* Organizer Card */}
        <div
          onClick={() => setSelectedRole('ORGANIZER')}
          className={`cursor-pointer p-6 rounded-xl border-2 transition-all flex flex-col justify-between space-y-4 ${
            selectedRole === 'ORGANIZER'
              ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
              : 'border-border/60 bg-card hover:border-border'
          }`}
        >
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-h3 font-semibold">Event Organizer</h3>
            <p className="text-caption text-muted">
              Publish events, configure venues and tier pricing, control flash-sale queues, and view live gross revenue analytics.
            </p>
          </div>
          <div className="flex items-center gap-2 text-label font-medium text-secondary">
            {selectedRole === 'ORGANIZER' && <Check className="w-4 h-4" />}
            <span>Selected as Organizer</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Link href="/onboarding">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
        <Button variant="primary" onClick={handleContinue} className="gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </section>
  );
}
