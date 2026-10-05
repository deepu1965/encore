'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSignup } from '@/features/auth/mutations';
import { cn } from '@/lib/utils';

const signupSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    displayName: z.string().min(1, 'Display name is required'),
    acceptTerms: z.boolean().refine((v) => v, 'You must accept the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export interface SignupFormProps {
  className?: string;
}

export function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const signupMutation = useSignup();

  const handleChange = (field: keyof SignupFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = signupSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await signupMutation.mutateAsync({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.displayName,
      });
      router.push(`/login?email=${encodeURIComponent(parsed.data.email)}&signup=success`);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Signup failed',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        id="signup-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors.email}
        disabled={signupMutation.isPending}
        autoComplete="email"
      />

      <Input
        id="signup-displayName"
        label="Display name"
        placeholder="Your name"
        value={formData.displayName}
        onChange={(e) => handleChange('displayName', e.target.value)}
        error={errors.displayName}
        disabled={signupMutation.isPending}
        autoComplete="name"
      />

      <Input
        id="signup-password"
        label="Password"
        type="password"
        placeholder="At least 8 characters"
        value={formData.password}
        onChange={(e) => handleChange('password', e.target.value)}
        error={errors.password}
        disabled={signupMutation.isPending}
        autoComplete="new-password"
      />

      <Input
        id="signup-confirmPassword"
        label="Confirm password"
        type="password"
        placeholder="Re-enter your password"
        value={formData.confirmPassword}
        onChange={(e) => handleChange('confirmPassword', e.target.value)}
        error={errors.confirmPassword}
        disabled={signupMutation.isPending}
        autoComplete="new-password"
      />

      <div className="flex items-start gap-2">
        <input
          id="signup-acceptTerms"
          type="checkbox"
          checked={formData.acceptTerms}
          onChange={(e) => handleChange('acceptTerms', e.target.checked)}
          disabled={signupMutation.isPending}
          className="mt-1 h-4 w-4 rounded border-border"
        />
        <label htmlFor="signup-acceptTerms" className="text-caption text-muted">
          I agree to the{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-caption text-error" role="alert">
          {errors.acceptTerms}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={signupMutation.isPending}
      >
        {signupMutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>

      {errors.form && (
        <p className="text-caption text-error" role="alert">
          {errors.form}
        </p>
      )}
    </form>
  );
}

import Link from 'next/link';
