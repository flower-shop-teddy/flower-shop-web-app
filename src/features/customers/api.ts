import { api } from '@/shared/api/client';
import type { Page, PageQuery } from '@/shared/api/types';

export interface Customer {
  id: number;
  customerCode: string;
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: number;
  customerCode: string;
  fullName: string;
  maskedPhone: string;
  maskedEmail?: string;
  status: string;
}

export interface Address {
  id: number;
  customerId: number;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string;
  province: string;
  note?: string;
  defaultAddress: boolean;
  version: number;
}

export interface AddressInput {
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  ward: string;
  province: string;
  note?: string;
}

export interface CreateCustomerRequest {
  fullName: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
}

export interface UpdateCustomerRequest {
  fullName: string;
  email?: string;
  dateOfBirth?: string;
  version: number;
}

export const MAX_ADDRESSES = 10;

/**
 * Sổ địa chỉ có hai bộ API cùng hình dạng: khách tự quản (/customers/me/addresses)
 * và nhân viên quản cho khách (/customers/{id}/addresses). Dùng chung một interface để tái sử dụng UI.
 */
export interface AddressBookApi {
  key: readonly unknown[];
  list: () => Promise<Address[]>;
  create: (body: AddressInput) => Promise<Address>;
  update: (id: number, body: AddressInput & { version: number }) => Promise<Address>;
  setDefault: (id: number) => Promise<Address>;
  remove: (id: number) => Promise<void>;
}

function addressBook(base: string, key: readonly unknown[]): AddressBookApi {
  return {
    key,
    list: () => api<Address[]>(`${base}/addresses`),
    create: (body) => api<Address>(`${base}/addresses`, { method: 'POST', body }),
    update: (id, body) => api<Address>(`${base}/addresses/${id}`, { method: 'PUT', body }),
    setDefault: (id) => api<Address>(`${base}/addresses/${id}/default`, { method: 'PUT' }),
    remove: (id) => api<void>(`${base}/addresses/${id}`, { method: 'DELETE' }),
  };
}

export const myAddresses = addressBook('/api/v1/customers/me', ['me', 'addresses']);
export const customerAddresses = (customerId: number) =>
  addressBook(`/api/v1/customers/${customerId}`, ['customers', customerId, 'addresses']);

export const customerApi = {
  me: () => api<Customer>('/api/v1/customers/me'),
  updateMe: (body: UpdateCustomerRequest) => api<Customer>('/api/v1/customers/me', { method: 'PUT', body }),

  /** Không có phone: mọi khách ACTIVE. Có phone: so khớp CHÍNH XÁC (backend cố ý không cho LIKE). */
  search: (phone: string | undefined, q: PageQuery = {}) =>
    api<Page<CustomerSummary>>('/api/v1/customers', { query: { phone, ...q } }),
  get: (id: number) => api<Customer>(`/api/v1/customers/${id}`),
  create: (body: CreateCustomerRequest) => api<Customer>('/api/v1/customers', { method: 'POST', body }),
  update: (id: number, body: UpdateCustomerRequest) =>
    api<Customer>(`/api/v1/customers/${id}`, { method: 'PUT', body }),
  deactivate: (id: number) => api<void>(`/api/v1/customers/${id}`, { method: 'DELETE' }),
};
