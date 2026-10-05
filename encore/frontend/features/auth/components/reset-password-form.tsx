'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirmPasswordReset } from '@/features/auth/mutations';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export interface ResetPasswordFormProps {
  className?: string;
}

export function ResetPasswordForm({ className }: ResetPasswordFormProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetMutation = useConfirmPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!token) {
      setErrors({ form: 'Invalid reset link. Please request a new one.' });
      return;
    }

    const parsed = resetPasswordSchema.safeParse(formData);
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
      await resetMutation.mutateAsync({
        token,
        newPassword: parsed.data.newPassword,
      });
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : 'Failed to reset password',
      });
    }
  };

  if (!token) {
    return (
      <div className={cn('text-center space-y-4', className)}>
        <p className="text-body text-error">
          Invalid reset link. Please request a new password reset.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        id="reset-newPassword"
        label="New password"
        type="password"
        placeholder="At least 8 characters"
        value={formData.newPassword}
        onChange={(e) => setFormData((p) => ({ ...p, newPassword: e.target.value }))}
        error={errors.newPassword}
        disabled={resetMutation.isPending}
        autoComplete="new-password"
      />

      <Input
        id="reset-confirmPassword"
        label="Confirm new password"
        type="password"
        placeholder="Re-enter your password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
        error={errors.confirmPassword}
        disabled={resetMutation.isPending}
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full"
        disabled={resetMutation.isPending}
      >
        {resetMutation.isPending ? 'Resetting...' : 'Reset password'}
      </Button>

      {errors.form && (
        <p className="text-caption text-error" role="alert">
          {errors.form}
        </p>
      )}
    </form>
  );
}
