import type { FieldViolation } from './types';

export const ErrorCodes = {
  VALIDATION: 'COM-400-001',
  UNAUTHORIZED: 'COM-401-001',
  FORBIDDEN: 'COM-403-001',
  NOT_FOUND: 'COM-404-001',
  OPTIMISTIC_LOCK: 'COM-409-001',
  INVALID_REFRESH: 'IDN-401-002',
  NETWORK: 'NET-000',
} as const;

/** Lỗi đã chuẩn hóa từ backend: luôn có mã lỗi, thông điệp, và correlationId để tra log. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly correlationId?: string;
  readonly violations: FieldViolation[];

  constructor(opts: {
    code: string;
    message: string;
    status: number;
    correlationId?: string;
    violations?: FieldViolation[];
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.code = opts.code;
    this.status = opts.status;
    this.correlationId = opts.correlationId;
    this.violations = opts.violations ?? [];
  }

  is(code: string): boolean {
    return this.code === code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
