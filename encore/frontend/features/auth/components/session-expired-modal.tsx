'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

const PROTECTED_PATHS = ['/checkout', '/select-seats', '/waiting-room'];

/**
 * Modal that appears when session expires during a protected flow.
 * Preserves the current path so the user can resume after re-login.
 */
export function SessionExpiredModal() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expiredPath, setExpiredPath] = useState<string | null>(null);

  useEffect(() => {
    const handleUnauthorized = (_event: CustomEvent<string>) => {
      // Only show in protected flows
      if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
        setExpiredPath(pathname);
        setOpen(true);
      }
    };

    window.addEventListener('auth:session-expired' as string, handleUnauthorized as EventListener);
    return () => {
      window.removeEventListener('auth:session-expired' as string, handleUnauthorized as EventListener);
    };
  }, [pathname]);

  const handleLogin = () => {
    const loginUrl = new URL('/login', window.location.origin);
    if (expiredPath) {
      loginUrl.searchParams.set('redirect', expiredPath);
    }
    window.location.href = loginUrl.toString();
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Session expired"
      description="Your session has expired. Please sign in again to continue."
      showClose
    >
      <div className="space-y-4">
        <p className="text-body text-muted">
          {expiredPath?.startsWith('/checkout') && 'Your cart has been preserved. Sign in to continue checkout.'}
          {expiredPath?.startsWith('/select-seats') && 'Your seat selection will be held for a few minutes. Sign in to continue.'}
          {expiredPath?.startsWith('/waiting-room') && 'Your place in line is preserved. Sign in to continue.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLogin}>
            Sign in
          </Button>
        </div>
      </div>
    </Modal>
  );
}
