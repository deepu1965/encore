'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/features/auth/mutations';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or User ID is required'),
  password: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export interface LoginFormProps {
  className?: string;
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';
  const emailParam = searchParams.get('email') ?? '';
  const isSignupSuccess = searchParams.get('signup') === 'success';
  const isResetSuccess = searchParams.get('reset') === 'success';

  const [formData, setFormData] = useState<LoginFormData>({
    identifier: emailParam,
    password: '',
  });
  const [fieldError, setFieldError] = useState<string | null>(null);

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    const parsed = loginSchema.safeParse(formData);
    if (!parsed.success) {
      const firstErr = parsed.error.errors[0];
      setFieldError(firstErr?.message ?? 'Invalid input');
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: parsed.data.identifier,
        userId: parsed.data.identifier,
        identifier: parsed.data.identifier,
        password: parsed.data.password,
      });
      router.push(redirect);
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {isSignupSuccess && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Account created successfully! Please sign in with your email.
        </div>
      )}

      {isResetSuccess && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Password reset successfully! Please sign in with your new password.
        </div>
      )}

      <Input
        id="login-identifier"
        label="Email or User ID"
        placeholder="you@example.com or user ID"
        value={formData.identifier}
        onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
        error={fieldError ?? undefined}
        disabled={loginMutation.isPending}
        autoComplete="username"
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        disabled={loginMutation.isPending}
        autoComplete="current-password"
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
      </Button>

      {loginMutation.isError && !fieldError && (
        <p className="text-caption text-error" role="alert">
          Unable to sign in. Please check your credentials.
        </p>
      )}
    </form>
  );
}
