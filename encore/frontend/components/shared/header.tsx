'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface HeaderProps {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
  className?: string;
  dense?: boolean;
}

export function Header({ logo, nav, actions, className, dense }: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border bg-background',
        dense ? 'h-12' : 'h-16',
        className,
      )}
    >
      <div className={cn('mx-auto flex h-full items-center gap-4 px-4', dense ? 'max-w-7xl' : 'max-w-6xl')}>
        <div className="flex items-center gap-2">
          {logo ?? (
            <Link href="/" className="text-h4 font-semibold text-foreground hover:opacity-80">
              Encore
            </Link>
          )}
        </div>
        {nav && <nav className="hidden md:flex items-center gap-1 text-label text-muted flex-1">{nav}</nav>}
        <div className="flex items-center gap-2 ml-auto">{actions}</div>
      </div>
    </header>
  );
}

export interface HeaderNavLinkProps {
  href: string;
  children: ReactNode;
  active?: boolean;
}

export function HeaderNavLink({ href, children, active }: HeaderNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-2 rounded-sm transition-colors',
        active ? 'text-foreground font-medium' : 'hover:text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}
