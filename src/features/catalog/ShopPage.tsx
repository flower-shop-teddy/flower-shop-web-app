import {
  ActionIcon,
  Box,
  Button,
  Card,
  Chip,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconSearch, IconShoppingBagPlus } from '@tabler/icons-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useCart } from '@/features/cart/CartProvider';
import { EmptyState, FlowerThumb, QueryState } from '@/shared/ui';
import { formatMoney } from '@/shared/lib/format';
import { categoryInfo, FLOWER_CATEGORIES, type FlowerCategory } from '@/shared/lib/labels';
import { catalogApi, type Flower } from './api';

const PAGE_SIZE = 100; // backend chưa có lọc/tìm kiếm -> tải trang lớn rồi lọc ở trình duyệt

function FlowerCard({ f }: { f: Flower }) {
  const cart = useCart();
  return (
    <Card padding="sm" style={{ display: 'flex', flexDirection: 'column' }}>
      <Card.Section
        component={Link}
        to={`/flowers/${f.id}`}
        aria-label={f.name}
        style={{ textDecoration: 'none' }}
      >
        <FlowerThumb category={f.category} size={170} radius="0" />
      </Card.Section>
      <Stack gap={4} mt="sm" style={{ flex: 1 }}>
        <Text size="xs" c="pink.6" fw={600} tt="uppercase">
          {categoryInfo[f.category]?.label ?? f.category}
        </Text>
        <Text
          component={Link}
          to={`/flowers/${f.id}`}
          fw={600}
          lineClamp={2}
          c="dark.6"
          style={{ textDecoration: 'none' }}
        >
          {f.name}
        </Text>
      </Stack>
      <Group justify="space-between" mt="sm" wrap="nowrap">
        <Text fw={700}>{formatMoney(f.unitPrice, f.currency)}</Text>
        <Tooltip label="Thêm vào giỏ">
          <ActionIcon
            size="lg"
            radius="xl"
            variant="light"
            aria-label={`Thêm ${f.name} vào giỏ`}
            onClick={() =>
              cart.add({
                flowerId: f.id,
                sku: f.sku,
                name: f.name,
                category: f.category,
                unitPrice: f.unitPrice,
                currency: f.currency,
              })
            }
          >
            <IconShoppingBagPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
}

export function ShopPage() {
  const [category, setCategory] = useState<FlowerCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  const q = useInfiniteQuery({
    queryKey: ['flowers', 'shop'],
    queryFn: ({ pageParam }) => catalogApi.list({ page: pageParam, size: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.page + 1 < last.totalPages ? last.page + 1 : undefined),
  });

  const flowers = useMemo(() => {
    const all = q.data?.pages.flatMap((p) => p.items) ?? [];
    const s = search.trim().toLowerCase();
    return all.filter(
      (f) => (category === 'ALL' || f.category === category) && (!s || f.name.toLowerCase().includes(s)),
    );
  }, [q.data, category, search]);

  return (
    <Stack gap="lg">
      <Box
        p={{ base: 'lg', sm: 40 }}
        style={{
          borderRadius: 'var(--mantine-radius-xl)',
          background: 'linear-gradient(120deg, #ffe3ec 0%, #fff0f6 45%, #e6fcf5 100%)',
        }}
      >
        <Title order={1} fz={{ base: 28, sm: 40 }} c="pink.8">
          Hoa tươi cho mọi khoảnh khắc
        </Title>
        <Text mt="xs" c="dark.4" maw={520}>
          Chọn hoa, chọn giờ giao, phần còn lại để chúng tôi lo. Giao trong 3 khung giờ mỗi ngày.
        </Text>
        <TextInput
          mt="lg"
          maw={420}
          size="md"
          radius="xl"
          placeholder="Tìm hoa theo tên…"
          leftSection={<IconSearch size={18} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
      </Box>

      <Chip.Group value={category} onChange={(v) => setCategory(v as FlowerCategory | 'ALL')}>
        {/* Điện thoại: một hàng cuộn ngang thay vì 4 hàng chip */}
        <Group gap="xs" wrap="nowrap" style={{ overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          <Chip value="ALL" variant="light" style={{ flexShrink: 0 }}>
            Tất cả
          </Chip>
          {FLOWER_CATEGORIES.map((c) => (
            <Chip key={c} value={c} variant="light" style={{ flexShrink: 0 }}>
              {categoryInfo[c].emoji} {categoryInfo[c].label}
            </Chip>
          ))}
        </Group>
      </Chip.Group>

      {q.isLoading ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} h={280} radius="lg" />
          ))}
        </SimpleGrid>
      ) : (
        <QueryState isLoading={false} error={q.error} onRetry={() => q.refetch()}>
          {flowers.length === 0 ? (
            <EmptyState
              title="Chưa có hoa phù hợp"
              description="Thử chọn loại khác hoặc bỏ bớt từ khóa tìm kiếm."
            />
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="md">
              {flowers.map((f) => (
                <FlowerCard key={f.id} f={f} />
              ))}
            </SimpleGrid>
          )}
          {q.hasNextPage && (
            <Group justify="center" mt="lg">
              <Button variant="light" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
                Xem thêm
              </Button>
            </Group>
          )}
        </QueryState>
      )}
    </Stack>
  );
}
