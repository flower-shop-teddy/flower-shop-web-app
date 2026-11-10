import {
  Alert,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconAlertCircle, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCart } from '@/features/cart/CartProvider';
import { AddressFormModal, formatAddress } from '@/features/customers/AddressBook';
import { myAddresses } from '@/features/customers/api';
import { orderApi, type PlaceOrderRequest } from '@/features/orders/api';
import { EmptyState, QueryState } from '@/shared/ui';
import { notifyError, notifySuccess } from '@/shared/lib/errors';
import { dayjs, formatMoney } from '@/shared/lib/format';
import { DELIVERY_SLOTS, slotInfo, type DeliverySlot } from '@/shared/lib/labels';
import {
  availableSlots,
  firstDeliveryDate,
  idempotency,
  lastDeliveryDate,
  SHIPPING_FEE,
  shopToday,
} from './rules';

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const addresses = useQuery({ queryKey: myAddresses.key, queryFn: myAddresses.list });

  const [addressId, setAddressId] = useState<string | null>(null);
  const [date, setDate] = useState<string>(() => firstDeliveryDate());
  const [slot, setSlot] = useState<DeliverySlot | null>(null);
  const [cardMessage, setCardMessage] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  // Giá trị tính ra từ state, không cần effect: chưa chọn thì dùng địa chỉ mặc định,
  // khung giờ đã chọn không còn hợp lệ (đổi ngày, hoặc đồng hồ trôi qua mốc 2 tiếng) thì lấy khung sớm nhất còn được.
  const defaultAddress = addresses.data?.find((a) => a.defaultAddress) ?? addresses.data?.[0];
  const selectedAddressId = addressId ?? (defaultAddress ? String(defaultAddress.id) : null);
  const slots = useMemo(() => availableSlots(date), [date]);
  const selectedSlot = slot && slots.includes(slot) ? slot : (slots[0] ?? null);

  const place = useMutation({
    mutationFn: ({ req, key }: { req: PlaceOrderRequest; key: string }) => orderApi.place(req, key),
    onSuccess: (order) => {
      idempotency.clear();
      cart.clear();
      void qc.invalidateQueries({ queryKey: ['my-orders'] });
      notifySuccess(
        `Mã đơn ${order.orderCode}. Cửa hàng sẽ gọi xác nhận trong ít phút.`,
        'Đặt hoa thành công',
      );
      navigate(`/account/orders/${order.orderCode}`, { replace: true });
    },
    onError: (e) => notifyError(e, 'Chưa đặt được đơn'),
  });

  if (cart.lines.length === 0 && !place.isSuccess) {
    return (
      <EmptyState
        title="Giỏ hàng đang trống"
        description="Hãy chọn hoa trước khi đặt đơn."
        action={
          <Button component={Link} to="/" mt="sm">
            Xem hoa
          </Button>
        }
      />
    );
  }

  const canSubmit = Boolean(selectedAddressId && selectedSlot && date) && !place.isPending;
  const submit = () => {
    if (!selectedAddressId || !selectedSlot) return;
    const req: PlaceOrderRequest = {
      addressId: Number(selectedAddressId),
      items: cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
      deliveryDate: date,
      deliverySlot: selectedSlot,
      cardMessage: cardMessage.trim() || undefined,
    };
    place.mutate({ req, key: idempotency.keyFor(req) });
  };

  return (
    <Stack>
      <Title order={2}>Đặt hoa</Title>
      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack>
            <Card>
              <Group justify="space-between" mb="sm">
                <Text fw={700}>1. Giao đến</Text>
                <Button
                  size="compact-sm"
                  variant="subtle"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => setAddOpen(true)}
                >
                  Địa chỉ mới
                </Button>
              </Group>
              <QueryState
                isLoading={addresses.isLoading}
                error={addresses.error}
                onRetry={() => addresses.refetch()}
              >
                {addresses.data?.length ? (
                  <Radio.Group value={selectedAddressId} onChange={setAddressId}>
                    <Stack gap="xs">
                      {addresses.data.map((a) => (
                        <Radio.Card key={a.id} value={String(a.id)} p="sm" radius="md">
                          <Group wrap="nowrap" align="flex-start">
                            <Radio.Indicator />
                            <div>
                              <Text fw={600} size="sm">
                                {a.recipientName} · {a.recipientPhone}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {formatAddress(a)}
                              </Text>
                            </div>
                          </Group>
                        </Radio.Card>
                      ))}
                    </Stack>
                  </Radio.Group>
                ) : (
                  <Alert variant="light" color="pink" icon={<IconAlertCircle size={18} />}>
                    Bạn chưa có địa chỉ nhận hoa. Bấm “Địa chỉ mới” để thêm.
                  </Alert>
                )}
              </QueryState>
            </Card>

            <Card>
              <Text fw={700} mb="sm">
                2. Thời gian giao
              </Text>
              <Stack>
                <DatePickerInput
                  label="Ngày giao"
                  valueFormat="dddd, DD/MM/YYYY"
                  minDate={shopToday()}
                  maxDate={lastDeliveryDate()}
                  value={date}
                  onChange={(v) => v && setDate(v)}
                  excludeDate={(d) => availableSlots(dayjs(d).format('YYYY-MM-DD')).length === 0}
                />
                <div>
                  <Text size="sm" fw={500} mb={4}>
                    Khung giờ
                  </Text>
                  <SegmentedControl
                    fullWidth
                    value={selectedSlot ?? ''}
                    onChange={(v) => setSlot(v as DeliverySlot)}
                    data={DELIVERY_SLOTS.map((s) => ({
                      value: s,
                      disabled: !slots.includes(s),
                      label: (
                        <Stack gap={0} py={2}>
                          <Text size="sm" fw={600}>
                            {slotInfo[s].label}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {slotInfo[s].range}
                          </Text>
                        </Stack>
                      ),
                    }))}
                  />
                  <Text size="xs" c="dimmed" mt={6}>
                    Khung giờ cần bắt đầu sau ít nhất 2 tiếng kể từ lúc đặt; đặt trước tối đa 7 ngày.
                  </Text>
                </div>
              </Stack>
            </Card>

            <Card>
              <Text fw={700} mb="sm">
                3. Lời nhắn trên thiệp
              </Text>
              <Textarea
                placeholder="Chúc mừng sinh nhật! Yêu thương gửi đến bạn…"
                autosize
                minRows={3}
                maxLength={300}
                value={cardMessage}
                onChange={(e) => setCardMessage(e.currentTarget.value)}
                description={`${cardMessage.length}/300 ký tự`}
              />
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card style={{ position: 'sticky', top: 80 }}>
            <Text fw={700} mb="sm">
              Đơn của bạn
            </Text>
            <Stack gap="xs">
              {cart.lines.map((l) => (
                <Group key={l.sku} justify="space-between" wrap="nowrap">
                  <Text size="sm" lineClamp={1}>
                    {l.quantity} × {l.name}
                  </Text>
                  <Text size="sm">{formatMoney(Number(l.unitPrice) * l.quantity, l.currency)}</Text>
                </Group>
              ))}
              <Divider my={4} />
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Phí giao
                </Text>
                <Text size="sm">{formatMoney(SHIPPING_FEE, cart.currency)}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={700}>Tạm tính</Text>
                <Text fw={800} size="lg" c="pink.7">
                  {formatMoney(cart.subtotal + SHIPPING_FEE, cart.currency)}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Tổng chính thức do hệ thống tính theo giá hiện hành tại thời điểm đặt.
              </Text>
              <Button size="md" mt="sm" onClick={submit} disabled={!canSubmit} loading={place.isPending}>
                Xác nhận đặt hoa
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {addOpen && (
        <AddressFormModal
          book={myAddresses}
          opened
          onClose={() => setAddOpen(false)}
          onSaved={(a) => setAddressId(String(a.id))}
        />
      )}
    </Stack>
  );
}
