import { api } from '@/shared/api/client';
import type { Money, Page, PageQuery } from '@/shared/api/types';
import type { DeliverySlot, OrderStatus } from '@/shared/lib/labels';

export interface OrderItem {
  sku: string;
  flowerName: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
}

export interface Order {
  orderCode: string;
  status: OrderStatus;
  customerId: number;
  items: OrderItem[];
  subtotal: Money;
  shippingFee: Money;
  total: Money;
  currency: string;
  recipient: {
    name: string;
    phone: string;
    addressLine: string;
    ward: string;
    province: string;
    note?: string;
  };
  deliveryDate: string;
  deliverySlot: DeliverySlot;
  cardMessage?: string;
  cancelReason?: string;
  placedAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

export interface StatusHistory {
  from?: OrderStatus;
  to: OrderStatus;
  reason?: string;
  actor?: string;
  occurredAt: string;
}

export interface PlaceOrderRequest {
  addressId: number;
  items: { sku: string; quantity: number }[];
  deliveryDate: string;
  deliverySlot: DeliverySlot;
  cardMessage?: string;
}

export type StaffAction = 'confirm' | 'prepare' | 'ship' | 'complete';

/** State machine của order-service: trạng thái hiện tại -> thao tác kế tiếp của nhân viên. */
export const nextStaffAction: Partial<Record<OrderStatus, { action: StaffAction; label: string }>> = {
  PENDING: { action: 'confirm', label: 'Xác nhận đơn' },
  CONFIRMED: { action: 'prepare', label: 'Bắt đầu cắm hoa' },
  PREPARING: { action: 'ship', label: 'Giao hàng' },
  DELIVERING: { action: 'complete', label: 'Đã giao xong' },
};

export const CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED'];

export const orderApi = {
  // Khách
  place: (body: PlaceOrderRequest, idempotencyKey: string) =>
    api<Order>('/api/v1/orders/me', { method: 'POST', body, headers: { 'Idempotency-Key': idempotencyKey } }),
  myOrders: (q: PageQuery = {}) => api<Page<Order>>('/api/v1/orders/me', { query: { ...q } }),
  myOrder: (code: string) => api<Order>(`/api/v1/orders/me/${encodeURIComponent(code)}`),
  cancelMine: (code: string, reason?: string) =>
    api<Order>(`/api/v1/orders/me/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: { reason } }),

  // Nhân viên
  list: (q: PageQuery & { status?: OrderStatus } = {}) =>
    api<Page<Order>>('/api/v1/orders', { query: { ...q } }),
  get: (code: string) => api<Order>(`/api/v1/orders/${encodeURIComponent(code)}`),
  history: (code: string) => api<StatusHistory[]>(`/api/v1/orders/${encodeURIComponent(code)}/history`),
  act: (code: string, action: StaffAction) =>
    api<Order>(`/api/v1/orders/${encodeURIComponent(code)}/${action}`, { method: 'POST' }),
  cancel: (code: string, reason?: string) =>
    api<Order>(`/api/v1/orders/${encodeURIComponent(code)}/cancel`, { method: 'POST', body: { reason } }),
};
