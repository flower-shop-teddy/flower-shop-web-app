import { Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ApiError, ErrorCodes, isApiError } from '@/shared/api/ApiError';

/** Thông điệp dễ hiểu hơn cho vài mã lỗi; các mã còn lại dùng message tiếng Việt của backend. */
const friendly: Record<string, string> = {
  [ErrorCodes.OPTIMISTIC_LOCK]: 'Dữ liệu vừa được người khác cập nhật. Hãy tải lại rồi sửa tiếp.',
  [ErrorCodes.FORBIDDEN]: 'Bạn không có quyền thực hiện thao tác này.',
  [ErrorCodes.VALIDATION]: 'Thông tin chưa hợp lệ, vui lòng kiểm tra các ô được đánh dấu.',
};

export function errorMessage(e: unknown): string {
  if (isApiError(e)) return friendly[e.code] ?? e.message;
  return 'Đã có lỗi không mong muốn.';
}

/** Toast lỗi luôn kèm mã lỗi + mã tra cứu (correlationId) để bộ phận hỗ trợ tìm đúng log. */
export function notifyError(e: unknown, title = 'Không thực hiện được') {
  const err = isApiError(e) ? e : null;
  notifications.show({
    color: 'red',
    title,
    autoClose: 8000,
    message: (
      <>
        <Text size="sm">{errorMessage(e)}</Text>
        {err && (
          <Text size="xs" c="dimmed" mt={4}>
            Mã lỗi {err.code}
            {err.correlationId ? ` · Mã tra cứu ${err.correlationId}` : ''}
          </Text>
        )}
      </>
    ),
  });
}

export function notifySuccess(message: string, title = 'Thành công') {
  notifications.show({ color: 'teal', title, message, autoClose: 4000 });
}

/**
 * Đổ lỗi validate của backend vào từng ô của form. Trả true nếu đã gắn được ít nhất một lỗi,
 * khi đó không cần toast. `fieldMap` để đổi tên field backend -> tên field trong form nếu khác nhau.
 */
export function applyServerErrors<T>(
  form: UseFormReturnType<T>,
  e: unknown,
  fieldMap: Record<string, string> = {},
): boolean {
  if (!(e instanceof ApiError) || e.violations.length === 0) return false;
  const values = form.getValues() as Record<string, unknown>;
  const errors: Record<string, string> = {};
  for (const v of e.violations) {
    const key = fieldMap[v.field] ?? v.field;
    if (key in values || key.includes('.')) errors[key] = v.message;
  }
  if (Object.keys(errors).length === 0) return false;
  form.setErrors(errors);
  return true;
}

/** Xử lý lỗi chuẩn khi submit form: lỗi theo ô thì hiện ở ô, còn lại thì toast. */
export function handleFormError<T>(form: UseFormReturnType<T>, e: unknown, title?: string) {
  if (!applyServerErrors(form, e)) notifyError(e, title);
}
