import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background text-center text-foreground">
      <h1 className="text-display">404</h1>
      <p className="text-body text-muted">We couldn&apos;t find that page.</p>
      <Link href="/" className={buttonVariants({ variant: 'primary' })}>
        Back to home
      </Link>
    </div>
  );
}
