import { api } from '@/shared/api/client';
import type { Money, Page, PageQuery } from '@/shared/api/types';
import type { FlowerCategory } from '@/shared/lib/labels';

export interface Flower {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category: FlowerCategory;
  unitPrice: Money;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlowerRequest {
  sku: string;
  name: string;
  description?: string;
  category: FlowerCategory;
  unitPrice: number;
  currency: string;
}

export interface UpdateFlowerRequest {
  name: string;
  description?: string;
  category: FlowerCategory;
  unitPrice: number;
  version: number;
}

export const catalogApi = {
  /** Chỉ hoa đang bán (ACTIVE), mới nhất trước. Public. */
  list: (q: PageQuery = {}) => api<Page<Flower>>('/api/v1/flowers', { query: { ...q }, auth: false }),
  get: (id: number) => api<Flower>(`/api/v1/flowers/${id}`, { auth: false }),
  bySku: (sku: string) => api<Flower>(`/api/v1/flowers/sku/${encodeURIComponent(sku)}`, { auth: false }),
  create: (body: CreateFlowerRequest) => api<Flower>('/api/v1/flowers', { method: 'POST', body }),
  update: (id: number, body: UpdateFlowerRequest) =>
    api<Flower>(`/api/v1/flowers/${id}`, { method: 'PUT', body }),
  deactivate: (id: number) => api<void>(`/api/v1/flowers/${id}`, { method: 'DELETE' }),
};

export const catalogKeys = {
  all: ['flowers'] as const,
  list: (q: PageQuery) => ['flowers', 'list', q] as const,
  detail: (id: number) => ['flowers', 'detail', id] as const,
};
