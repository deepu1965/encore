import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface FooterProps {
  children?: ReactNode;
  className?: string;
  links?: Array<{ href: string; label: string }>;
}

export function Footer({ children, className, links }: FooterProps) {
  return (
    <footer className={cn('border-t border-border bg-background', className)}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-caption text-muted">
            {children ?? '© Encore. All rights reserved.'}
          </div>
          {links && links.length > 0 && (
            <nav aria-label="Footer">
              <ul className="flex flex-wrap gap-4 text-caption">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-muted hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
