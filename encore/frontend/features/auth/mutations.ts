'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api-client';
import { sessionKeys } from './queries';
import type { LoginCredentials, SignupData, PasswordResetRequest, PasswordResetConfirm, SessionUser } from './types';

interface LoginResponse {
  role: SessionUser['role'];
  userId?: string;
  email?: string;
}

interface SignupResponse {
  user: SessionUser;
}

/**
 * Login mutation — calls the BFF route which sets httpOnly cookies.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const res = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Set the session in the query cache
      queryClient.setQueryData(sessionKeys.all, {
        id: data.userId || variables.userId || variables.email || '',
        email: data.email || variables.email || '',
        displayName: '',
        role: data.role,
      });
    },
  });
}

/**
 * Logout mutation — clears cookies and query cache.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/auth/login');
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sessionKeys.all });
      router.push('/');
    },
  });
}

/**
 * Signup mutation — calls the backend signup endpoint.
 * Note: Backend doesn't have real signup yet (gap G-8). This is a placeholder.
 */
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupData): Promise<SignupResponse> => {
      const res = await apiClient.post<any>('/api/v1/auth/signup', {
        email: data.email,
        display_name: data.displayName,
        password: data.password,
        role: data.role === 'ORGANIZER' ? 'ORGANIZER' : 'BUYER',
      });
      return {
        user: {
          id: res.data?.user?.id,
          email: res.data?.user?.email,
          displayName: res.data?.user?.displayName || res.data?.user?.display_name,
          role: res.data?.user?.role === 'ORGANIZER' ? 'ORGANIZER' : 'CUSTOMER',
        },
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(sessionKeys.all, data.user);
    },
  });
}

/**
 * Request password reset mutation.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (data: PasswordResetRequest): Promise<void> => {
      await apiClient.post('/api/v1/auth/password-reset-request', {
        email: data.email,
      });
    },
  });
}

/**
 * Confirm password reset mutation.
 */
export function useConfirmPasswordReset() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: PasswordResetConfirm): Promise<void> => {
      await apiClient.post('/api/v1/auth/password-reset-confirm', {
        token: data.token,
        new_password: data.newPassword,
      });
    },
    onSuccess: () => {
      router.push('/login?reset=success');
    },
  });
}
