'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/features/auth/queries';
import { useLogout } from '@/features/auth/mutations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationsDropdown } from '@/components/shared/notifications-dropdown';
import {
  ShieldAlert,
  Building2,
  Ticket,
  LogOut,
  User as UserIcon,
  Sparkles,
  Wallet,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CustomerNavbar() {
  const pathname = usePathname();
  const { data: session, isLoading } = useSession();
  const logoutMutation = useLogout();

  const isAdmin = session?.role === 'ADMIN' || session?.role === 'OPERATIONS';
  const isOrganizer = session?.role === 'ORGANIZER' || isAdmin;

  const navLinks = [
    { href: '/explore', label: 'Explore Events' },
    { href: '/venues', label: 'Venues' },
    { href: '/resale', label: 'Resale' },
    { href: '/leaderboard', label: 'Leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 gap-4">
        {/* Brand & Primary Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-sm group-hover:scale-105 transition-transform">
              E
            </div>
            <span className="text-h4 font-bold tracking-tight text-foreground">Encore</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-muted">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 rounded-md transition-colors hover:text-foreground hover:bg-muted/30',
                    active && 'text-primary font-semibold bg-primary/10 hover:bg-primary/15'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Action Bar & Role Portals */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Operations Portal Button (Always visible for Admin) */}
          {isAdmin && (
            <Link href="/ops">
              <Button
                variant="outline"
                size="sm"
                className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/20 font-bold gap-1.5 shadow-sm h-9"
              >
                <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                <span>Ops Console</span>
              </Button>
            </Link>
          )}

          {/* Organizer Console Button */}
          {isOrganizer && !isAdmin && (
            <Link href="/organizer/events">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20 font-semibold gap-1.5 shadow-sm h-9"
              >
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden sm:inline">Organizer Hub</span>
              </Button>
            </Link>
          )}

          {/* Customer Tickets Shortcut */}
          {session && (
            <Link href="/tickets">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 text-foreground/80 hover:text-foreground h-9',
                  pathname.startsWith('/tickets') && 'bg-primary/10 text-primary'
                )}
              >
                <Ticket className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">My Tickets</span>
              </Button>
            </Link>
          )}

          {/* Customer Wallet Shortcut */}
          {session && (
            <Link href="/wallet">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 text-foreground/80 hover:text-foreground h-9',
                  pathname.startsWith('/wallet') && 'bg-primary/10 text-primary font-semibold'
                )}
              >
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="hidden sm:inline font-medium">Wallet</span>
              </Button>
            </Link>
          )}

          {/* Notification Bell */}
          <NotificationsDropdown />

          {/* Authentication State */}
          {isLoading ? (
            <div className="w-20 h-9 bg-muted/40 rounded-md animate-pulse" />
          ) : session ? (
            <div className="flex items-center gap-2 pl-1 border-l border-border/60">
              <div className="hidden lg:flex flex-col items-end text-xs leading-tight">
                <span className="font-semibold text-foreground max-w-[130px] truncate">
                  {session.displayName || session.email}
                </span>
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                  {session.role}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="h-9 px-2.5 text-muted hover:text-error hover:bg-error/10 gap-1.5 text-xs"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-9">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm" className="h-9">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
