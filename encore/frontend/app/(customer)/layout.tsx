import type { ReactNode } from 'react';
import Link from 'next/link';

import { ThemeApplier } from '@/components/shared/theme-applier';
import { CustomerNavbar } from '@/components/shared/navbar';

/**
 * Customer shell (light default). Header / footer / cart-hold summary.
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <ThemeApplier personaDefault="light" />
      <CustomerNavbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-border/80 bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div>
            <p className="font-semibold text-foreground">Encore Live Event Ticketing</p>
            <p className="mt-0.5">High-throughput, anti-scalp primary and resale ticketing infrastructure.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/ops" className="hover:text-primary transition-colors font-medium">
              Operations Console
            </Link>
            <Link href="/organizer/events" className="hover:text-primary transition-colors font-medium">
              Organizer Portal
            </Link>
            <Link href="/explore" className="hover:text-primary transition-colors">
              Browse Events
            </Link>
            <Link href="/tickets" className="hover:text-primary transition-colors">
              Ticket Vault
            </Link>
            <span>© Encore</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
