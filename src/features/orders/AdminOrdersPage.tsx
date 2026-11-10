import { Button, Card, Drawer, Group, ScrollArea, Stack, Table, Tabs, Text } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { EmptyState, OrderStatusBadge, PageBar, PageHeader, QueryState } from '@/shared/ui';
import { ErrorCodes, isApiError } from '@/shared/api/ApiError';
import { notifyError, notifySuccess } from '@/shared/lib/errors';
import { formatDate, formatDateTime, formatMoney } from '@/shared/lib/format';
import { ORDER_STATUSES, orderStatusInfo, slotInfo, type OrderStatus } from '@/shared/lib/labels';
import { CANCELLABLE, nextStaffAction, orderApi, type Order, type StaffAction } from './api';
import { openCancelDialog } from './CancelDialog';
import { OrderHistory, OrderSummary } from './OrderView';

type Tab = OrderStatus | 'ALL';

function OrderDrawer({ code, onClose }: { code: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const canManage = can('order:manage');
  const detail = useQuery({
    queryKey: ['orders', 'detail', code],
    queryFn: () => orderApi.get(code!),
    enabled: Boolean(code),
  });
  const history = useQuery({
    queryKey: ['orders', 'history', code],
    queryFn: () => orderApi.history(code!),
    enabled: Boolean(code),
  });

  const refreshAll = (o?: Order) => {
    if (o) qc.setQueryData(['orders', 'detail', code], o);
    void qc.invalidateQueries({ queryKey: ['orders'] });
  };

  const act = useMutation({
    mutationFn: (action: StaffAction) => orderApi.act(code!, action),
    onSuccess: (o) => {
      refreshAll(o);
      notifySuccess(`Đơn ${o.orderCode}: ${orderStatusInfo[o.status].label}`);
    },
    onError: (e) => {
      notifyError(e, 'Không chuyển được trạng thái');
      // Ví dụ hết hạn giữ hàng -> hệ thống tự hủy đơn; hoặc người khác vừa xử lý trước. Tải lại để thấy đúng trạng thái.
      if (isApiError(e) && e.status === 409) refreshAll();
    },
  });
  const cancel = useMutation({
    mutationFn: (reason?: string) => orderApi.cancel(code!, reason),
    onSuccess: (o) => {
      refreshAll(o);
      notifySuccess(`Đã hủy đơn ${o.orderCode}, hoa đã trả về kho.`);
    },
    onError: (e) => {
      notifyError(e, 'Không hủy được đơn');
      if (isApiError(e) && e.code !== ErrorCodes.FORBIDDEN) refreshAll();
    },
  });

  const o = detail.data;
  const next = o ? nextStaffAction[o.status] : undefined;
  const busy = act.isPending || cancel.isPending;

  return (
    <Drawer
      opened={Boolean(code)}
      onClose={onClose}
      position="right"
      size="xl"
      scrollAreaComponent={ScrollArea.Autosize}
      title={<Text fw={700}>Chi tiết đơn</Text>}
    >
      <QueryState isLoading={detail.isLoading} error={detail.error} onRetry={() => detail.refetch()}>
        {o && (
          <Stack>
            <OrderSummary order={o} />
            {canManage && (next || CANCELLABLE.includes(o.status)) && (
              <Card shadow="none" bg="pink.0" style={{ borderColor: 'var(--mantine-color-pink-2)' }}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Thao tác tiếp theo
                  </Text>
                  <Group gap="xs">
                    {CANCELLABLE.includes(o.status) && (
                      <Button
                        variant="subtle"
                        color="red"
                        leftSection={<IconX size={16} />}
                        disabled={busy}
                        loading={cancel.isPending}
                        onClick={() => openCancelDialog(o.orderCode, (r) => cancel.mutate(r))}
                      >
                        Hủy đơn
                      </Button>
                    )}
                    {next && (
                      <Button onClick={() => act.mutate(next.action)} loading={act.isPending} disabled={busy}>
                        {next.label}
                      </Button>
                    )}
                  </Group>
                </Group>
                {o.status === 'PENDING' && (
                  <Text size="xs" c="dimmed" mt={6}>
                    Gọi cho người đặt để xác nhận trước khi bấm. Đơn chờ quá 60 phút sẽ được hệ thống tự hủy.
                  </Text>
                )}
              </Card>
            )}
            <Card shadow="none">
              <Text fw={700} mb="sm">
                Lịch sử trạng thái
              </Text>
              <QueryState isLoading={history.isLoading} error={history.error}>
                {history.data && <OrderHistory history={history.data} />}
              </QueryState>
            </Card>
          </Stack>
        )}
      </QueryState>
    </Drawer>
  );
}

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') as Tab | null) ?? 'PENDING';
  const [page, setPage] = useState(0);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['orders', 'list', tab, page],
    queryFn: () => orderApi.list({ status: tab === 'ALL' ? undefined : tab, page, size: 20 }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // đơn mới vào liên tục
  });

  return (
    <Stack>
      <PageHeader
        title="Đơn hàng"
        description="Bấm vào một đơn để xem chi tiết và chuyển trạng thái."
        actions={
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => q.refetch()}
            loading={q.isFetching && !q.isLoading}
          >
            Làm mới
          </Button>
        }
      />
      <Tabs
        value={tab}
        onChange={(t) => {
          setPage(0);
          setParams(t && t !== 'PENDING' ? { status: t } : {});
        }}
      >
        <Tabs.List style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
          {ORDER_STATUSES.map((s) => (
            <Tabs.Tab key={s} value={s}>
              {orderStatusInfo[s].label}
            </Tabs.Tab>
          ))}
          <Tabs.Tab value="ALL">Tất cả</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Card p={0}>
        <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {q.data?.items.length === 0 ? (
            <EmptyState title="Không có đơn nào ở trạng thái này" />
          ) : (
            <Table.ScrollContainer minWidth={820}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mã đơn</Table.Th>
                    <Table.Th>Người nhận</Table.Th>
                    <Table.Th>Giao</Table.Th>
                    <Table.Th ta="right">Tổng</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                    <Table.Th>Đặt lúc</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {q.data?.items.map((o) => (
                    <Table.Tr
                      key={o.orderCode}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setOpenCode(o.orderCode)}
                    >
                      <Table.Td fw={600}>{o.orderCode}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{o.recipient.name}</Text>
                        <Text size="xs" c="dimmed">
                          {o.recipient.ward}, {o.recipient.province}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {formatDate(o.deliveryDate)}
                        <Text size="xs" c="dimmed">
                          {slotInfo[o.deliverySlot]?.label} {slotInfo[o.deliverySlot]?.range}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">{formatMoney(o.total, o.currency)}</Table.Td>
                      <Table.Td>
                        <OrderStatusBadge status={o.status} />
                      </Table.Td>
                      <Table.Td>{formatDateTime(o.placedAt)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </QueryState>
      </Card>
      <PageBar page={page} totalPages={q.data?.totalPages ?? 0} onChange={setPage} />
      <OrderDrawer code={openCode} onClose={() => setOpenCode(null)} />
    </Stack>
  );
}
