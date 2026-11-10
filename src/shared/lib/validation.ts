import { z } from 'zod';

/** Luật validate copy từ DTO backend để báo lỗi ngay trên form; backend vẫn kiểm tra lại. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
export const skuSchema = z
  .string()
  .trim()
  .regex(/^[A-Z0-9-]{3,30}$/, 'SKU 3–30 ký tự: chữ IN HOA, số, dấu -');
export const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine((v) => v === '' || z.email().safeParse(v).success, 'Email không hợp lệ');

/** Chính sách mật khẩu của identity-service. */
export function passwordSchema(loginIdField?: () => string) {
  return z
    .string()
    .min(8, 'Tối thiểu 8 ký tự')
    .max(72, 'Tối đa 72 ký tự')
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Phải có cả chữ và số')
    .refine((v) => {
      const id = loginIdField?.().trim().toLowerCase();
      return !id || !v.toLowerCase().includes(id);
    }, 'Không được chứa tên đăng nhập / số điện thoại');
}

/** Chuỗi rỗng -> undefined để không gửi field tùy chọn lên server. */
export function emptyToUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === '' ? undefined : v;
  return out as T;
}
