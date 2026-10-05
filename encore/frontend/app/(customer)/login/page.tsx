'use client';

import { Suspense } from 'react';
import Link from 'next/link';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

function LoginContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center">
        <p className="text-caption text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <Link
          href="/forgot-password"
          className="text-caption text-muted hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <section className="mx-auto max-w-md py-8">
      <Suspense fallback={<Card><CardContent className="p-8 text-center text-muted">Loading...</CardContent></Card>}>
        <LoginContent />
      </Suspense>
    </section>
  );
}
