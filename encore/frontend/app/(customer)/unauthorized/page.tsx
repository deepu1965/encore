import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <section className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-h1">Sign in required</h1>
      <p className="max-w-md text-body text-muted">
        You need to be signed in to view this page.
      </p>
      <div className="flex gap-3">
        <Link href="/login">
          <Button variant="primary">Sign in</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </section>
  );
}
