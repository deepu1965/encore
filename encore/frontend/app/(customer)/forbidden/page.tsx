import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export default function ForbiddenPage() {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h1">Access denied</h1>
      <p className="max-w-md text-body text-muted">
        Your account doesn&apos;t have permission to view this page.
      </p>
      <Link href="/" className={buttonVariants({ variant: 'primary' })}>
        Back to home
      </Link>
    </section>
  );
}
