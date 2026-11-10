import { Anchor, Breadcrumbs, Button, Card, Grid, Stack, Table, Tabs, Text, Title } from '@mantine/core';
import { IconMapPin, IconPackage, IconUser } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AddressBook } from '@/features/customers/AddressBook';
import { customerApi, myAddresses } from '@/features/customers/api';
import { CustomerProfileForm } from '@/features/customers/CustomerProfileForm';
import { CANCELLABLE, orderApi } from '@/features/orders/api';
import { openCancelDialog } from '@/features/orders/CancelDialog';
import { OrderProgress, OrderSummary } from '@/features/orders/OrderView';
import { EmptyState, OrderStatusBadge, PageBar, QueryState } from '@/shared/ui';
import { notifyError, notifySuccess } from '@/shared/lib/errors';
import { formatDate, formatDateTime, formatMoney } from '@/shared/lib/format';
import { slotInfo } from '@/shared/lib/labels';

function ProfileTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['me', 'profile'], queryFn: customerApi.me });
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data && (
        <CustomerProfileForm
          key={q.data.version}
          customer={q.data}
          onSave={async (body) => {
            const c = await customerApi.updateMe(body);
            qc.setQueryData(['me', 'profile'], c);
            return c;
          }}
          onReload={() => q.refetch()}
        />
      )}
    </QueryState>
  );
}

function MyOrdersTab() {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['my-orders', page],
    queryFn: () => orderApi.myOrders({ page, size: 10 }),
    placeholderData: keepPreviousData,
  });
  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {q.data?.items.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đơn nào"
          action={
            <Button component={Link} to="/" mt="sm">
              Chọn hoa ngay
            </Button>
          }
        />
      ) : (
        <>
          <Table.ScrollContainer minWidth={560}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mã đơn</Table.Th>
                  <Table.Th>Ngày đặt</Table.Th>
                  <Table.Th>Giao</Table.Th>
                  <Table.Th ta="right">Tổng</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {q.data?.items.map((o) => (
                  <Table.Tr
                    key={o.orderCode}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/account/orders/${o.orderCode}`)}
                  >
                    <Table.Td fw={600}>{o.orderCode}</Table.Td>
                    <Table.Td>{formatDateTime(o.placedAt)}</Table.Td>
                    <Table.Td>
                      {formatDate(o.deliveryDate)} · {slotInfo[o.deliverySlot]?.label}
                    </Table.Td>
                    <Table.Td ta="right">{formatMoney(o.total, o.currency)}</Table.Td>
                    <Table.Td>
                      <OrderStatusBadge status={o.status} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <PageBar page={page} totalPages={q.data?.totalPages ?? 0} onChange={setPage} />
        </>
      )}
    </QueryState>
  );
}

export function AccountPage({ tab = 'profile' }: { tab?: 'profile' | 'addresses' | 'orders' }) {
  const navigate = useNavigate();
  return (
    <Stack>
      <Title order={2}>Tài khoản của tôi</Title>
      <Tabs
        value={tab}
        onChange={(t) => navigate(t === 'profile' ? '/account' : `/account/${t}`)}
        keepMounted={false}
      >
        <Tabs.List mb="lg">
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Hồ sơ
          </Tabs.Tab>
          <Tabs.Tab value="addresses" leftSection={<IconMapPin size={16} />}>
            Sổ địa chỉ
          </Tabs.Tab>
          <Tabs.Tab value="orders" leftSection={<IconPackage size={16} />}>
            Đơn hàng
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="profile">
          <ProfileTab />
        </Tabs.Panel>
        <Tabs.Panel value="addresses">
          <AddressBook book={myAddresses} />
        </Tabs.Panel>
        <Tabs.Panel value="orders">
          <MyOrdersTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export function MyOrderDetailPage() {
  const code = useParams().code ?? '';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['my-orders', 'detail', code], queryFn: () => orderApi.myOrder(code) });
  const cancel = useMutation({
    mutationFn: (reason?: string) => orderApi.cancelMine(code, reason),
    onSuccess: (o) => {
      qc.setQueryData(['my-orders', 'detail', code], o);
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      notifySuccess('Đã hủy đơn, hoa đã được trả về kho.');
    },
    onError: (e) => notifyError(e, 'Không hủy được đơn'),
  });

  return (
    <Stack>
      <Breadcrumbs>
        <Anchor component={Link} to="/account/orders" size="sm">
          Đơn hàng của tôi
        </Anchor>
        <Text size="sm">{code}</Text>
      </Breadcrumbs>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {q.data && (
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <OrderSummary
                order={q.data}
                actions={
                  CANCELLABLE.includes(q.data.status) && (
                    <Button
                      color="red"
                      variant="light"
                      loading={cancel.isPending}
                      onClick={() => openCancelDialog(code, (r) => cancel.mutate(r))}
                    >
                      Hủy đơn
                    </Button>
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card>
                <Text fw={700} mb="md">
                  Tiến trình
                </Text>
                <OrderProgress order={q.data} />
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </QueryState>
    </Stack>
  );
}
