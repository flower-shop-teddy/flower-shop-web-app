/** Envelope chuẩn của mọi API backend (common-lib ApiResponse). code "00" = thành công. */
export interface ApiEnvelope<T> {
  code: string;
  message?: string;
  data?: T;
  correlationId?: string;
  timestamp?: string;
}

/** common-lib PageResponse: page bắt đầu từ 0, size tối đa 100. */
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Lỗi validate (COM-400-001) trả danh sách ô bị sai. */
export interface FieldViolation {
  field: string;
  message: string;
}

/** BigDecimal được Jackson ghi thành số JSON; nhận cả chuỗi cho chắc. */
export type Money = number | string;

export interface PageQuery {
  page?: number;
  size?: number;
}
