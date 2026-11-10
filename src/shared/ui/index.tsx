import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Pagination,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertTriangle, IconMoodEmpty, IconRefresh } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/shared/lib/errors';
import { categoryInfo, orderStatusInfo, type FlowerCategory, type OrderStatus } from '@/shared/lib/labels';
import { isApiError } from '@/shared/api/ApiError';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-end" mb="lg" wrap="wrap" gap="sm">
      <Box>
        <Title order={2}>{title}</Title>
        {description && (
          <Text component="div" c="dimmed" size="sm" mt={4}>
            {description}
          </Text>
        )}
      </Box>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const info = orderStatusInfo[status as OrderStatus] ?? { label: status, color: 'gray' };
  return (
    <Badge color={info.color} variant="light" radius="sm">
      {info.label}
    </Badge>
  );
}

/** Backend chưa có ảnh hoa: dùng ô màu + biểu tượng theo loại hoa làm ảnh minh họa. */
export function FlowerThumb({
  category,
  size = 160,
  radius = 'md',
}: {
  category: string;
  size?: number | string;
  radius?: string;
}) {
  const info = categoryInfo[category as FlowerCategory] ?? { emoji: '🌼', tint: '#fff0f6' };
  return (
    <Center
      h={size}
      style={{
        background: `radial-gradient(circle at 30% 25%, #ffffff 0%, ${info.tint} 70%)`,
        borderRadius: `var(--mantine-radius-${radius})`,
        fontSize: typeof size === 'number' ? size * 0.42 : 56,
        userSelect: 'none',
      }}
      aria-hidden
    >
      {info.emoji}
    </Center>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Stack align="center" gap="xs" py="xl" c="dimmed">
      <IconMoodEmpty size={40} stroke={1.4} />
      <Text fw={600} c="dark.4">
        {title}
      </Text>
      {description && (
        <Text size="sm" ta="center" maw={420}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}

/** Hiển thị trạng thái của một query: đang tải / lỗi (kèm nút thử lại) / nội dung. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (isLoading)
    return (
      <Center py="xl">
        <Loader color="pink" type="dots" />
      </Center>
    );
  if (error)
    return (
      <Alert
        color="red"
        variant="light"
        icon={<IconAlertTriangle size={18} />}
        title="Không tải được dữ liệu"
      >
        <Text size="sm">{errorMessage(error)}</Text>
        {isApiError(error) && error.correlationId && (
          <Text size="xs" c="dimmed" mt={4}>
            Mã tra cứu {error.correlationId}
          </Text>
        )}
        {onRetry && (
          <Button
            mt="sm"
            size="xs"
            variant="white"
            color="red"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
          >
            Thử lại
          </Button>
        )}
      </Alert>
    );
  return <>{children}</>;
}

/** Phân trang cho PageResponse (page của backend bắt đầu từ 0, Mantine bắt đầu từ 1). */
export function PageBar({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <Group justify="center" mt="md">
      <Pagination
        value={page + 1}
        total={totalPages}
        onChange={(p) => onChange(p - 1)}
        color="pink"
        radius="md"
      />
    </Group>
  );
}

/** Hộp xác nhận cho thao tác khó quay lại (hủy đơn, khóa tài khoản, ngừng bán...). */
export function confirmAction(opts: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}) {
  modals.openConfirmModal({
    title: opts.title,
    children: <Text size="sm">{opts.message}</Text>,
    labels: { confirm: opts.confirmLabel, cancel: 'Quay lại' },
    confirmProps: { color: opts.danger ? 'red' : 'pink' },
    onConfirm: opts.onConfirm,
  });
}
