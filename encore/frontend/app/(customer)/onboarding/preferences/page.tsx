'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Heart, Music, Check } from 'lucide-react';

const GENRES = [
  'Rock & Alternative',
  'Electronic & EDM',
  'Hip-Hop & R&B',
  'Pop & Commercial',
  'Classical & Symphony',
  'Jazz & Blues',
  'Indie & Folk',
  'Metal & Hardcore',
  'Sports & Arena',
  'Comedy & Theatre',
];

export default function OnboardingPreferencesPage() {
  const router = useRouter();
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Rock & Alternative', 'Electronic & EDM', 'Indie & Folk']);

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleContinue = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('onboarding_genres', JSON.stringify(selectedGenres));
    }
    router.push('/onboarding/complete');
  };

  return (
    <section className="mx-auto max-w-xl py-12 px-4 space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-display font-bold">Step 3: Event Preferences</h1>
        <p className="text-body text-muted">
          Select genres and experiences you love to power your personalized discovery feed.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-secondary" /> Preferred Categories
          </CardTitle>
          <CardDescription>
            Choose at least one category to receive presale alerts and drop notifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            {GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-surface/50 text-foreground border-border/60 hover:border-primary/50'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  {genre}
                </button>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-4">
          <Link href="/onboarding/profile">
            <Button type="button" variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            onClick={handleContinue}
            disabled={selectedGenres.length === 0}
            className="gap-2"
          >
            Finish Setup <ArrowRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  );
}
