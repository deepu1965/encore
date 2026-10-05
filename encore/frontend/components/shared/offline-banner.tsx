'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

export interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-center justify-center gap-2 bg-error text-primary-foreground px-4 py-2 text-label',
        className,
      )}
    >
      <span>●</span>
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
