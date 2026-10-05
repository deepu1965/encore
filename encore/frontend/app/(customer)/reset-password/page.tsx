'use client';

import { Suspense } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form';

function ResetPasswordContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
      <CardFooter className="text-center">
        <Link href="/login" className="text-caption text-muted hover:text-foreground">
          ← Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto max-w-md py-8">
      <Suspense fallback={<Card><CardContent className="p-8 text-center text-muted">Loading...</CardContent></Card>}>
        <ResetPasswordContent />
      </Suspense>
    </section>
  );
}
