'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SkeletonText, SkeletonCard } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ComponentsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <div className={cn('min-h-screen py-8', theme === 'dark' && 'dark bg-background')}>
      <div className="mx-auto max-w-4xl px-4">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-display font-bold">Component Catalog</h1>
            <p className="text-body text-muted mt-1">
              Browse all Encore components. Toggle between light and dark themes.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </Button>
        </header>

        <div className="space-y-12">
          {/* Primitives */}
          <section>
            <h2 className="text-h2 font-semibold mb-4">Primitives</h2>
            <div className="space-y-8">
              {/* Button */}
              <Card>
                <CardHeader>
                  <CardTitle>Button</CardTitle>
                  <CardDescription>Primary interaction control</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </CardContent>
              </Card>

              {/* Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Input</CardTitle>
                  <CardDescription>Text input with label, helper, and error states</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <Input label="Email" placeholder="you@example.com" helperText="We'll never share your email" />
                  <Input label="Password" type="password" error="Password must be at least 8 characters" />
                </CardContent>
              </Card>

              {/* Select */}
              <Card>
                <CardHeader>
                  <CardTitle>Select</CardTitle>
                  <CardDescription>Dropdown select with native accessibility</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <Select
                    label="Country"
                    placeholder="Select a country"
                    options={[
                      { value: 'us', label: 'United States' },
                      { value: 'ca', label: 'Canada' },
                      { value: 'uk', label: 'United Kingdom' },
                    ]}
                  />
                  <Select
                    label="State"
                    error="Please select a state"
                    options={[
                      { value: 'ny', label: 'New York' },
                      { value: 'ca', label: 'California' },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Badge */}
              <Card>
                <CardHeader>
                  <CardTitle>Badge</CardTitle>
                  <CardDescription>Status and category indicators</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Badge>Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="error">Error</Badge>
                  <Badge variant="info">Info</Badge>
                </CardContent>
              </Card>

              {/* Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Progress</CardTitle>
                  <CardDescription>Progress indicator with aria-valuenow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={25} />
                  <Progress value={60} variant="success" />
                  <Progress value={90} variant="warning" />
                </CardContent>
              </Card>

              {/* Skeleton */}
              <Card>
                <CardHeader>
                  <CardTitle>Skeleton</CardTitle>
                  <CardDescription>Loading placeholders</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-label mb-2">Text</p>
                    <SkeletonText lines={3} />
                  </div>
                  <div>
                    <p className="text-label mb-2">Card</p>
                    <SkeletonCard />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Composites */}
          <section>
            <h2 className="text-h2 font-semibold mb-4">Composite Components</h2>
            <div className="space-y-8">
              {/* EventCard */}
              <Card>
                <CardHeader>
                  <CardTitle>EventCard</CardTitle>
                  <CardDescription>Event listing card with poster, status, price</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-muted">
                    EventCard renders in the events discovery views. See components/shared/event-card.tsx
                  </p>
                </CardContent>
              </Card>

              {/* SeatMap */}
              <Card>
                <CardHeader>
                  <CardTitle>SeatMap</CardTitle>
                  <CardDescription>Interactive seat selection with parallel list view (a11y)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-muted">
                    SeatMap provides both visual and list views per accessibility.md §3. See
                    components/shared/seat-map.tsx
                  </p>
                </CardContent>
              </Card>

              {/* MetricCard */}
              <Card>
                <CardHeader>
                  <CardTitle>MetricCard</CardTitle>
                  <CardDescription>Ops dashboard metric display</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-md border border-border">
                    <p className="text-caption text-muted">Label</p>
                    <p className="text-display font-bold tabular-nums">1,234</p>
                  </div>
                  <div className="text-center p-4 rounded-md border border-border">
                    <p className="text-caption text-muted">Label</p>
                    <p className="text-display font-bold tabular-nums">56ms</p>
                  </div>
                  <div className="text-center p-4 rounded-md border border-border">
                    <p className="text-caption text-muted">Label</p>
                    <p className="text-display font-bold tabular-nums">99.9%</p>
                  </div>
                </CardContent>
              </Card>

              {/* State components */}
              <Card>
                <CardHeader>
                  <CardTitle>State Components</CardTitle>
                  <CardDescription>Empty, error, permission, offline states</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-body text-muted">
                    EmptyState, ErrorState, PermissionDenied, OfflineBanner, ReconnectingBadge, MaintenanceScreen
                    provide consistent UX for non-happy-path states. See components/shared/*.tsx
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border text-caption text-muted text-center">
          Phase 2 Design System — all 68 components implemented
        </footer>
      </div>
    </div>
  );
}
