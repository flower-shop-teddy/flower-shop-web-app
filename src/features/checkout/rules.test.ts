import { describe, expect, it } from 'vitest';
import type { PlaceOrderRequest } from '@/features/orders/api';
import {
  availableSlots,
  firstDeliveryDate,
  idempotency,
  isSlotAvailable,
  lastDeliveryDate,
  shopToday,
} from './rules';

// 2026-11-10 10:30 giờ Việt Nam = 03:30 UTC
const now = new Date('2026-11-10T03:30:00Z');

describe('khung giờ giao', () => {
  it('khung phải bắt đầu sau ít nhất 2 tiếng', () => {
    expect(isSlotAvailable('2026-11-10', 'MORNING', now)).toBe(false); // 08:00 đã qua
    expect(isSlotAvailable('2026-11-10', 'AFTERNOON', now)).toBe(true); // 13:00 >= 12:30
    expect(isSlotAvailable('2026-11-10', 'EVENING', now)).toBe(true);
  });

  it('đúng mốc 2 tiếng vẫn được, thiếu 1 phút thì không', () => {
    const at1100 = new Date('2026-11-10T04:00:00Z'); // 11:00 VN -> 13:00 vừa đủ
    const at1101 = new Date('2026-11-10T04:01:00Z');
    expect(isSlotAvailable('2026-11-10', 'AFTERNOON', at1100)).toBe(true);
    expect(isSlotAvailable('2026-11-10', 'AFTERNOON', at1101)).toBe(false);
  });

  it('tính "hôm nay" theo giờ Việt Nam, không theo giờ máy', () => {
    // 23:30 UTC ngày 10 = 06:30 sáng ngày 11 ở VN
    expect(shopToday(new Date('2026-11-10T23:30:00Z'))).toBe('2026-11-11');
  });

  it('đặt trước tối đa 7 ngày, không nhận ngày đã qua', () => {
    expect(lastDeliveryDate(now)).toBe('2026-11-17');
    expect(availableSlots('2026-11-17', now)).toHaveLength(3);
    expect(availableSlots('2026-11-18', now)).toHaveLength(0);
    expect(availableSlots('2026-11-09', now)).toHaveLength(0);
  });

  it('tối muộn thì ngày giao sớm nhất là ngày mai', () => {
    const late = new Date('2026-11-10T13:00:00Z'); // 20:00 VN
    expect(firstDeliveryDate(late)).toBe('2026-11-11');
    expect(firstDeliveryDate(now)).toBe('2026-11-10');
  });
});

describe('Idempotency-Key khi đặt đơn', () => {
  const req: PlaceOrderRequest = {
    addressId: 1,
    items: [
      { sku: 'ROSE-01', quantity: 2 },
      { sku: 'LILY-01', quantity: 1 },
    ],
    deliveryDate: '2026-11-11',
    deliverySlot: 'MORNING',
  };

  it('bấm lại cùng nội dung -> giữ nguyên key (server trả lại đúng đơn cũ)', () => {
    const k1 = idempotency.keyFor(req);
    const k2 = idempotency.keyFor({ ...req, items: [...req.items].reverse() }); // thứ tự dòng không quan trọng
    expect(k2).toBe(k1);
    expect(k1).toMatch(/^[A-Za-z0-9-]{8,64}$/); // đúng định dạng order-service chấp nhận
  });

  it('đổi nội dung đơn -> key mới (tránh ORD-422-001)', () => {
    const k1 = idempotency.keyFor(req);
    expect(idempotency.keyFor({ ...req, deliverySlot: 'EVENING' })).not.toBe(k1);
  });

  it('đặt thành công rồi xóa key -> lần sau là đơn mới', () => {
    const k1 = idempotency.keyFor(req);
    idempotency.clear();
    expect(idempotency.keyFor(req)).not.toBe(k1);
  });
});
