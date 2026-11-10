import { api } from '@/shared/api/client';
import type { Money, Page, PageQuery } from '@/shared/api/types';

export interface Lot {
  lotCode: string;
  sku: string;
  qtyReceived: number;
  qtyAvailable: number;
  unitCost: Money;
  currency: string;
  supplier?: string;
  receivedAt: string;
  expiresAt: string;
  expired: boolean;
}

export interface Stock {
  sku: string;
  sellable: number;
  expired: number;
}

export interface Movement {
  type: string;
  quantityDelta: number;
  reference?: string;
  actor?: string;
  occurredAt: string;
}

export interface ReceiveLotRequest {
  sku: string;
  quantity: number;
  unitCost: number;
  currency: string;
  expiresAt: string; // Instant ISO
  supplier?: string;
}

export interface WasteRequest {
  quantity: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'OTHER';
  note?: string;
}

export const inventoryApi = {
  availability: (sku: string) =>
    api<{ sku: string; available: boolean }>('/api/v1/inventory/availability', {
      query: { sku },
      auth: false,
    }),
  stock: (sku: string) => api<Stock>('/api/v1/inventory/stock', { query: { sku } }),
  lots: (sku: string, q: PageQuery & { includeEmpty?: boolean } = {}) =>
    api<Page<Lot>>('/api/v1/inventory/lots', { query: { sku, ...q } }),
  lot: (lotCode: string) => api<Lot>(`/api/v1/inventory/lots/${encodeURIComponent(lotCode)}`),
  movements: (lotCode: string) =>
    api<Movement[]>(`/api/v1/inventory/lots/${encodeURIComponent(lotCode)}/movements`),
  receive: (body: ReceiveLotRequest) => api<Lot>('/api/v1/inventory/lots', { method: 'POST', body }),
  waste: (lotCode: string, body: WasteRequest) =>
    api<Lot>(`/api/v1/inventory/lots/${encodeURIComponent(lotCode)}/waste`, { method: 'POST', body }),
};
