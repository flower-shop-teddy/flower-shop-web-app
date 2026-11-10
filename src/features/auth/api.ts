import { api } from '@/shared/api/client';
import type { TokenResponse } from '@/shared/api/session';

export type UserType = 'STAFF' | 'CUSTOMER' | 'SERVICE';

export interface Me {
  publicId: string;
  userType: UserType;
  username?: string;
  phone?: string;
  customerId?: number;
  roles: string[];
  permissions: string[];
  passwordChangeRequired: boolean;
  lastLoginAt?: string;
}

export interface RegisterRequest {
  phone: string;
  password: string;
  fullName: string;
  email?: string;
  dateOfBirth?: string;
}

export const authApi = {
  login: (loginId: string, password: string) =>
    api<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: { loginId, password }, auth: false }),
  logout: (refreshToken: string) =>
    api<void>('/api/v1/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  me: () => api<Me>('/api/v1/auth/me'),
  register: (body: RegisterRequest) =>
    api<{ publicId: string; customerId: number; customerCode: string }>('/api/v1/auth/register', {
      method: 'POST',
      body,
      auth: false,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<void>('/api/v1/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),
};
