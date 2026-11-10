import { ActionIcon, Box, Button, Divider, Drawer, Group, NumberInput, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { EmptyState, FlowerThumb } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { MAX_QTY, useCart } from './CartProvider';

export function CartDrawer() {
  const cart = useCart();
  const navigate = useNavigate();

  return (
    <Drawer
      opened={cart.opened}
      onClose={cart.close}
      position="right"
      size="md"
      title={<Text fw={700}>Giỏ hoa của bạn</Text>}
    >
      {cart.lines.length === 0 ? (
        <EmptyState title="Giỏ hàng đang trống" description="Chọn vài bó hoa thật xinh nhé!" />
      ) : (
        <Stack gap="md">
          {cart.lines.map((l) => (
            <Group key={l.sku} wrap="nowrap" align="center" gap="sm">
              <Box w={64} style={{ flexShrink: 0 }}>
                <FlowerThumb category={l.category} size={64} radius="md" />
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} truncate>
                  {l.name}
                </Text>
                <Text size="sm" c="dimmed">
                  {formatMoney(l.unitPrice, l.currency)}
                </Text>
              </Box>
              <NumberInput
                w={78}
                size="xs"
                min={1}
                max={MAX_QTY}
                clampBehavior="strict"
                allowDecimal={false}
                value={l.quantity}
                onChange={(v) => cart.setQuantity(l.sku, Number(v))}
                aria-label={`Số lượng ${l.name}`}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => cart.remove(l.sku)}
                aria-label={`Bỏ ${l.name}`}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))}
          <Divider />
          <Group justify="space-between">
            <Text c="dimmed">Tạm tính</Text>
            <Text fw={700} size="lg">
              {formatMoney(cart.subtotal, cart.currency)}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            Giá cuối cùng và phí giao hàng được xác nhận khi đặt đơn.
          </Text>
          <Button
            size="md"
            onClick={() => {
              cart.close();
              navigate('/checkout');
            }}
          >
            Đặt hoa
          </Button>
        </Stack>
      )}
    </Drawer>
  );
}
