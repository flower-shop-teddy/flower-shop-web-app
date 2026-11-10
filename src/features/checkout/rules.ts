import { dayjs, SHOP_TZ } from '@/shared/lib/format';
import { DELIVERY_SLOTS, slotInfo, type DeliverySlot } from '@/shared/lib/labels';
import type { PlaceOrderRequest } from '@/features/orders/api';

/** Khớp order-service: khung giờ phải bắt đầu sau ít nhất 2 giờ, đặt trước tối đa 7 ngày. */
export const MIN_LEAD_HOURS = 2;
export const MAX_ADVANCE_DAYS = 7;
export const SHIPPING_FEE = 30_000;

/** Hôm nay theo giờ cửa hàng, dạng YYYY-MM-DD. */
export function shopToday(now: Date = new Date()): string {
  return dayjs(now).tz(SHOP_TZ).format('YYYY-MM-DD');
}

export function lastDeliveryDate(now: Date = new Date()): string {
  return dayjs.tz(shopToday(now), SHOP_TZ).add(MAX_ADVANCE_DAYS, 'day').format('YYYY-MM-DD');
}

export function slotStart(date: string, slot: DeliverySlot) {
  return dayjs.tz(`${date} ${String(slotInfo[slot].startHour).padStart(2, '0')}:00`, SHOP_TZ);
}

export function isSlotAvailable(date: string, slot: DeliverySlot, now: Date = new Date()): boolean {
  if (date < shopToday(now) || date > lastDeliveryDate(now)) return false;
  return !slotStart(date, slot).isBefore(dayjs(now).add(MIN_LEAD_HOURS, 'hour'));
}

export function availableSlots(date: string, now: Date = new Date()): DeliverySlot[] {
  return DELIVERY_SLOTS.filter((s) => isSlotAvailable(date, s, now));
}

/** Ngày gần nhất còn khung giờ giao được (tối nay đã quá giờ thì sang ngày mai). */
export function firstDeliveryDate(now: Date = new Date()): string {
  let d = dayjs.tz(shopToday(now), SHOP_TZ);
  for (let i = 0; i <= MAX_ADVANCE_DAYS; i++) {
    const s = d.format('YYYY-MM-DD');
    if (availableSlots(s, now).length > 0) return s;
    d = d.add(1, 'day');
  }
  return d.format('YYYY-MM-DD');
}

/**
 * Idempotency-Key cho lần đặt đơn.
 * - Bấm lại / mạng chập chờn / F5 khi đang gửi: dùng LẠI key cũ -> server trả đúng đơn đã tạo, không ra đơn thứ hai.
 * - Đổi nội dung đơn (giỏ, địa chỉ, ngày giờ...): sinh key MỚI, vì server từ chối key cũ đi với nội dung khác (ORD-422-001).
 * - Đặt thành công: xóa key, lần đặt sau là đơn mới.
 * Lưu ở sessionStorage để sống qua F5 nhưng không sống quá phiên tab.
 */
const KEY_STORE = 'fs.checkout.idem';

function fingerprint(req: PlaceOrderRequest): string {
  const items = [...req.items].sort((a, b) => a.sku.localeCompare(b.sku));
  return JSON.stringify({ ...req, items, cardMessage: req.cardMessage ?? '' });
}

export const idempotency = {
  keyFor(req: PlaceOrderRequest): string {
    const fp = fingerprint(req);
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY_STORE) ?? 'null') as {
        key: string;
        fp: string;
      } | null;
      if (saved && saved.fp === fp) return saved.key;
    } catch {
      /* hỏng thì sinh mới */
    }
    const key = crypto.randomUUID();
    try {
      sessionStorage.setItem(KEY_STORE, JSON.stringify({ key, fp }));
    } catch {
      /* không lưu được vẫn dùng được trong lần bấm này */
    }
    return key;
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY_STORE);
    } catch {
      /* bỏ qua */
    }
  },
};
