'use client';

import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRequestPasswordReset } from '@/features/auth/mutations';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});



export interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resetMutation = useRequestPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0];
      setError(firstErr?.message ?? 'Invalid email');
      return;
    }

    try {
      await resetMutation.mutateAsync(parsed.data);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    }
  };

  if (submitted) {
    return (
      <div className={cn('text-center space-y-4', className)}>
        <p className="text-body text-foreground">
          Check your email for a password reset link.
        </p>
        <p className="text-caption text-muted">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-primary hover:underline"
          >
            try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        id="forgot-email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
        disabled={resetMutation.isPending}
        autoComplete="email"
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={resetMutation.isPending}
      >
        {resetMutation.isPending ? 'Sending...' : 'Send reset link'}
      </Button>
    </form>
  );
}
