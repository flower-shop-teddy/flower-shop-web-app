import { Card, Divider, Group, SimpleGrid, Stack, Table, Text, Timeline, Title } from '@mantine/core';
import { IconCircleCheck, IconCircleDot, IconCircleX } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { OrderStatusBadge } from '@/shared/ui';
import { formatDate, formatDateTime, formatMoney } from '@/shared/lib/format';
import { orderStatusInfo, slotInfo } from '@/shared/lib/labels';
import type { Order, StatusHistory } from './api';

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="sm">{children}</Text>
    </Stack>
  );
}

export function OrderSummary({ order, actions }: { order: Order; actions?: ReactNode }) {
  const r = order.recipient;
  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Title order={3}>Đơn {order.orderCode}</Title>
          <OrderStatusBadge status={order.status} />
        </Group>
        {actions && <Group gap="xs">{actions}</Group>}
      </Group>

      <Card shadow="none">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Info label="Giao lúc">
            {formatDate(order.deliveryDate)} · {slotInfo[order.deliverySlot]?.label} (
            {slotInfo[order.deliverySlot]?.range})
          </Info>
          <Info label="Người nhận">
            {r.name} · {r.phone}
          </Info>
          <Info label="Địa chỉ">
            {r.addressLine}, {r.ward}, {r.province}
          </Info>
        </SimpleGrid>
        {(r.note || order.cardMessage || order.cancelReason) && (
          <>
            <Divider my="md" />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {r.note && <Info label="Ghi chú giao hàng">{r.note}</Info>}
              {order.cardMessage && <Info label="Lời nhắn trên thiệp">“{order.cardMessage}”</Info>}
              {order.cancelReason && <Info label="Lý do hủy">{order.cancelReason}</Info>}
            </SimpleGrid>
          </>
        )}
      </Card>

      <Card shadow="none" p={0}>
        <Table.ScrollContainer minWidth={420}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Hoa</Table.Th>
                <Table.Th ta="right">Đơn giá</Table.Th>
                <Table.Th ta="right">SL</Table.Th>
                <Table.Th ta="right">Thành tiền</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {order.items.map((i) => (
                <Table.Tr key={i.sku}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {i.flowerName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {i.sku}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">{formatMoney(i.unitPrice, order.currency)}</Table.Td>
                  <Table.Td ta="right">{i.quantity}</Table.Td>
                  <Table.Td ta="right">{formatMoney(i.lineTotal, order.currency)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Stack gap={4} p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Tiền hoa
            </Text>
            <Text size="sm">{formatMoney(order.subtotal, order.currency)}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Phí giao
            </Text>
            <Text size="sm">{formatMoney(order.shippingFee, order.currency)}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={700}>Tổng cộng</Text>
            <Text fw={800} c="pink.7" size="lg">
              {formatMoney(order.total, order.currency)}
            </Text>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}

/** Tiến trình đơn cho khách: dựng từ các mốc thời gian trong OrderResponse. */
export function OrderProgress({ order }: { order: Order }) {
  if (order.status === 'CANCELLED') {
    return (
      <Timeline active={1} bulletSize={22} color="gray">
        <Timeline.Item title="Đã đặt" bullet={<IconCircleCheck size={14} />}>
          <Text size="xs" c="dimmed">
            {formatDateTime(order.placedAt)}
          </Text>
        </Timeline.Item>
        <Timeline.Item title="Đã hủy" bullet={<IconCircleX size={14} />}>
          <Text size="xs" c="dimmed">
            {formatDateTime(order.cancelledAt)}
          </Text>
        </Timeline.Item>
      </Timeline>
    );
  }
  const steps = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED'] as const;
  const at: Partial<Record<(typeof steps)[number], string | undefined>> = {
    PENDING: order.placedAt,
    CONFIRMED: order.confirmedAt,
    DELIVERED: order.deliveredAt,
  };
  const current = steps.indexOf(order.status as (typeof steps)[number]);
  return (
    <Timeline active={current} bulletSize={22} lineWidth={2}>
      {steps.map((s, i) => (
        <Timeline.Item
          key={s}
          title={s === 'PENDING' ? 'Đã đặt, chờ xác nhận' : orderStatusInfo[s].label}
          bullet={i <= current ? <IconCircleCheck size={14} /> : <IconCircleDot size={14} />}
        >
          {at[s] && (
            <Text size="xs" c="dimmed">
              {formatDateTime(at[s])}
            </Text>
          )}
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

/** Lịch sử trạng thái chi tiết (chỉ nhân viên): ai đổi, lúc nào, vì sao. */
export function OrderHistory({ history }: { history: StatusHistory[] }) {
  return (
    <Timeline active={history.length - 1} bulletSize={18} lineWidth={2}>
      {history.map((h, i) => (
        <Timeline.Item key={i} title={orderStatusInfo[h.to]?.label ?? h.to}>
          <Text size="xs" c="dimmed">
            {formatDateTime(h.occurredAt)}
            {h.actor ? ` · ${h.actor}` : ''}
          </Text>
          {h.reason && <Text size="xs">{h.reason}</Text>}
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
