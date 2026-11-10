import {
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Grid,
  Group,
  NumberInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconCircleCheck, IconCircleX, IconShoppingBagPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { MAX_QTY, useCart } from '@/features/cart/CartProvider';
import { inventoryApi } from '@/features/inventory/api';
import { FlowerThumb, QueryState } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { categoryInfo } from '@/shared/lib/labels';
import { catalogApi, catalogKeys } from './api';

export function FlowerDetailPage() {
  const id = Number(useParams().id);
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const q = useQuery({
    queryKey: catalogKeys.detail(id),
    queryFn: () => catalogApi.get(id),
    enabled: Number.isFinite(id),
  });
  const f = q.data;
  const avail = useQuery({
    queryKey: ['inventory', 'availability', f?.sku],
    queryFn: () => inventoryApi.availability(f!.sku),
    enabled: Boolean(f?.sku),
    staleTime: 30_000,
  });
  const sellable = f?.status === 'ACTIVE';
  const inStock = avail.data?.available !== false;

  return (
    <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
      {f && (
        <Stack>
          <Breadcrumbs>
            <Anchor component={Link} to="/" size="sm">
              Cửa hàng
            </Anchor>
            <Text size="sm">{f.name}</Text>
          </Breadcrumbs>
          <Grid gutter="xl">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <FlowerThumb category={f.category} size={380} radius="xl" />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap="md">
                <Group gap="xs">
                  <Badge variant="light">{categoryInfo[f.category]?.label ?? f.category}</Badge>
                  {!sellable ? (
                    <Badge color="gray">Ngừng kinh doanh</Badge>
                  ) : avail.isSuccess ? (
                    inStock ? (
                      <Badge color="teal" variant="light" leftSection={<IconCircleCheck size={12} />}>
                        Còn hàng
                      </Badge>
                    ) : (
                      <Badge color="red" variant="light" leftSection={<IconCircleX size={12} />}>
                        Tạm hết hàng
                      </Badge>
                    )
                  ) : null}
                </Group>
                <Title order={1} fz={{ base: 26, sm: 34 }}>
                  {f.name}
                </Title>
                <Text fz={28} fw={800} c="pink.7">
                  {formatMoney(f.unitPrice, f.currency)}
                </Text>
                {f.description && (
                  <Text c="dark.4" style={{ whiteSpace: 'pre-line' }}>
                    {f.description}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  Mã sản phẩm: {f.sku}
                </Text>
                <Group align="flex-end">
                  <NumberInput
                    label="Số lượng"
                    w={110}
                    min={1}
                    max={MAX_QTY}
                    clampBehavior="strict"
                    allowDecimal={false}
                    value={qty}
                    onChange={(v) => setQty(Number(v) || 1)}
                  />
                  <Button
                    size="md"
                    leftSection={<IconShoppingBagPlus size={18} />}
                    disabled={!sellable || !inStock}
                    onClick={() =>
                      cart.add(
                        {
                          flowerId: f.id,
                          sku: f.sku,
                          name: f.name,
                          category: f.category,
                          unitPrice: f.unitPrice,
                          currency: f.currency,
                        },
                        qty,
                      )
                    }
                  >
                    Thêm vào giỏ
                  </Button>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </QueryState>
  );
}
