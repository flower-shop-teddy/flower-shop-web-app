import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/vi';
import type { Money } from '@/shared/api/types';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');

/** Cửa hàng hoạt động theo giờ Việt Nam, kể cả khi trình duyệt đặt múi giờ khác. */
export const SHOP_TZ = 'Asia/Ho_Chi_Minh';

export { dayjs };

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: Money | null | undefined, currency = 'VND'): string {
  if (value === null || value === undefined || value === '') return '—';
  let f = moneyFormatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat('vi-VN', { style: 'currency', currency });
    moneyFormatters.set(currency, f);
  }
  return f.format(Number(value));
}

/** Instant (UTC) -> giờ cửa hàng. */
export function formatDateTime(v: string | null | undefined): string {
  return v ? dayjs(v).tz(SHOP_TZ).format('DD/MM/YYYY HH:mm') : '—';
}

/** LocalDate "YYYY-MM-DD" (không có múi giờ). */
export function formatDate(v: string | null | undefined): string {
  return v ? dayjs(v, 'YYYY-MM-DD').format('DD/MM/YYYY') : '—';
}

export function formatNumber(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(v);
}
