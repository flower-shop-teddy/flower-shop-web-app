import { Button, Card, Group, SimpleGrid, Skeleton, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconFlower, IconPackageImport, IconUserPlus } from '@tabler/icons-react';
import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { orderApi } from '@/features/orders/api';
import { PageHeader } from '@/shared/ui';
import { formatNumber } from '@/shared/lib/format';
import { orderStatusInfo, type OrderStatus } from '@/shared/lib/labels';

const WATCHED: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING'];

export function DashboardPage() {
  const { me, can } = useAuth();
  const canOrders = can('order:read');
  // Mỗi trạng thái hỏi 1 bản ghi để lấy totalElements: rẻ, không cần API thống kê riêng.
  const counts = useQueries({
    queries: WATCHED.map((status) => ({
      queryKey: ['orders', 'count', status],
      queryFn: () => orderApi.list({ status, size: 1 }),
      enabled: canOrders,
      refetchInterval: 60_000,
    })),
  });

  const shortcuts = [
    { to: '/admin/orders', label: 'Xử lý đơn chờ xác nhận', icon: IconArrowRight, perm: 'order:manage' },
    { to: '/admin/inventory', label: 'Nhập lô hoa mới', icon: IconPackageImport, perm: 'inventory:write' },
    { to: '/admin/flowers', label: 'Thêm hoa vào danh mục', icon: IconFlower, perm: 'flower:write' },
    { to: '/admin/customers', label: 'Tạo hồ sơ khách', icon: IconUserPlus, perm: 'customer:create' },
  ].filter((s) => can(s.perm));

  return (
    <Stack>
      <PageHeader
        title={`Xin chào, ${me?.username ?? ''} 👋`}
        description={`Vai trò: ${me?.roles.join(', ') || '—'}`}
      />

      {canOrders && (
        <SimpleGrid cols={{ base: 2, md: 4 }}>
          {WATCHED.map((s, i) => {
            const q = counts[i];
            return (
              <Card key={s} component={Link} to={`/admin/orders?status=${s}`} padding="lg">
                <Text size="sm" c="dimmed">
                  {orderStatusInfo[s].label}
                </Text>
                {q?.isLoading ? (
                  <Skeleton h={36} mt={6} w={60} />
                ) : (
                  <Text fz={34} fw={800} c={`${orderStatusInfo[s].color}.7`} lh={1.2} mt={4}>
                    {q?.data ? formatNumber(q.data.totalElements) : '—'}
                  </Text>
                )}
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      {shortcuts.length > 0 && (
        <Card>
          <Text fw={700} mb="sm">
            Thao tác nhanh
          </Text>
          <Group>
            {shortcuts.map((s) => (
              <Button
                key={s.to}
                component={Link}
                to={s.to}
                variant="light"
                leftSection={
                  <ThemeIcon size="sm" variant="transparent">
                    <s.icon size={16} />
                  </ThemeIcon>
                }
              >
                {s.label}
              </Button>
            ))}
          </Group>
        </Card>
      )}
    </Stack>
  );
}
