import { api } from '@/shared/api/client';
import type { Page, PageQuery } from '@/shared/api/types';
import type { UserType } from '@/features/auth/api';

export interface UserAccount {
  publicId: string;
  userType: UserType;
  username?: string;
  phoneMasked?: string;
  customerId?: number;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  locked: boolean;
  lockedUntil?: string;
  passwordChangeRequired: boolean;
  roles: string[];
  lastLoginAt?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Role {
  code: string;
  name: string;
  system: boolean;
  permissions: string[];
}

export interface TemporaryPassword {
  user: UserAccount;
  temporaryPassword: string;
}

const base = '/api/v1/users';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const usersApi = {
  list: (q: PageQuery & { type?: UserType } = {}) => api<Page<UserAccount>>(base, { query: { ...q } }),
  get: (id: string) => api<UserAccount>(path(id)),
  createStaff: (username: string, roles: string[]) =>
    api<TemporaryPassword>(base, { method: 'POST', body: { username, roles } }),
  assignRoles: (id: string, roles: string[]) =>
    api<UserAccount>(`${path(id)}/roles`, { method: 'PUT', body: { roles } }),
  disable: (id: string) => api<UserAccount>(`${path(id)}/disable`, { method: 'POST' }),
  enable: (id: string) => api<UserAccount>(`${path(id)}/enable`, { method: 'POST' }),
  unlock: (id: string) => api<UserAccount>(`${path(id)}/unlock`, { method: 'POST' }),
  resetPassword: (id: string) => api<TemporaryPassword>(`${path(id)}/reset-password`, { method: 'POST' }),
  roles: () => api<Role[]>('/api/v1/roles'),
};
