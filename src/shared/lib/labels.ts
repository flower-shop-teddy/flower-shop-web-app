/** Nhãn tiếng Việt + màu cho các enum backend. Một chỗ duy nhất để đổi chữ hiển thị. */

export const FLOWER_CATEGORIES = [
  'ROSE',
  'LILY',
  'ORCHID',
  'SUNFLOWER',
  'TULIP',
  'CARNATION',
  'BOUQUET',
  'BASKET',
] as const;
export type FlowerCategory = (typeof FLOWER_CATEGORIES)[number];

export const categoryInfo: Record<FlowerCategory, { label: string; emoji: string; tint: string }> = {
  ROSE: { label: 'Hoa hồng', emoji: '🌹', tint: '#ffe3ec' },
  LILY: { label: 'Hoa ly', emoji: '🪷', tint: '#fff0f6' },
  ORCHID: { label: 'Hoa lan', emoji: '🌺', tint: '#f3e8ff' },
  SUNFLOWER: { label: 'Hướng dương', emoji: '🌻', tint: '#fff9db' },
  TULIP: { label: 'Tulip', emoji: '🌷', tint: '#ffe8f0' },
  CARNATION: { label: 'Cẩm chướng', emoji: '🌸', tint: '#fff0f3' },
  BOUQUET: { label: 'Bó hoa', emoji: '💐', tint: '#e6fcf5' },
  BASKET: { label: 'Giỏ hoa', emoji: '🧺', tint: '#fff4e6' },
};

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orderStatusInfo: Record<OrderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'yellow' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'blue' },
  PREPARING: { label: 'Đang cắm hoa', color: 'grape' },
  DELIVERING: { label: 'Đang giao', color: 'cyan' },
  DELIVERED: { label: 'Đã giao', color: 'teal' },
  CANCELLED: { label: 'Đã hủy', color: 'gray' },
};

export const DELIVERY_SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
export type DeliverySlot = (typeof DELIVERY_SLOTS)[number];

/** Khung giờ giao theo giờ Việt Nam (khớp enum DeliverySlot của order-service). */
export const slotInfo: Record<DeliverySlot, { label: string; range: string; startHour: number }> = {
  MORNING: { label: 'Sáng', range: '08:00–12:00', startHour: 8 },
  AFTERNOON: { label: 'Chiều', range: '13:00–17:00', startHour: 13 },
  EVENING: { label: 'Tối', range: '18:00–21:00', startHour: 18 },
};

export const wasteReasonLabel: Record<string, string> = {
  EXPIRED: 'Hết hạn',
  DAMAGED: 'Dập, hỏng',
  OTHER: 'Lý do khác',
};

export const movementLabel: Record<string, { label: string; color: string }> = {
  RECEIVE: { label: 'Nhập lô', color: 'teal' },
  RESERVE: { label: 'Giữ cho đơn', color: 'blue' },
  RELEASE: { label: 'Trả về kho', color: 'cyan' },
  EXPIRE_HOLD: { label: 'Hết hạn giữ', color: 'orange' },
  WASTE: { label: 'Hủy hỏng', color: 'red' },
};

export const userStatusInfo: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ kích hoạt', color: 'yellow' },
  ACTIVE: { label: 'Hoạt động', color: 'teal' },
  DISABLED: { label: 'Đã khóa', color: 'gray' },
};

export const userTypeLabel: Record<string, string> = {
  STAFF: 'Nhân viên',
  CUSTOMER: 'Khách hàng',
  SERVICE: 'Service',
};
