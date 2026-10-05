import type { Role } from '@/types';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}

export interface LoginCredentials {
  userId?: string;
  email?: string;
  identifier?: string;
  password?: string;
}

export interface SignupData {
  email: string;
  password: string;
  displayName: string;
  role?: Role;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface AuthState {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
