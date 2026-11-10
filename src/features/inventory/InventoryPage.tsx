import {
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Menu,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  ActionIcon,
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconDots, IconHistory, IconPackageImport, IconTrashX } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthProvider';
import { catalogApi } from '@/features/catalog/api';
import { EmptyState, PageBar, PageHeader, QueryState } from '@/shared/ui';
import { handleFormError, notifySuccess } from '@/shared/lib/errors';
import { dayjs, formatDateTime, formatMoney, formatNumber, SHOP_TZ } from '@/shared/lib/format';
import { movementLabel, wasteReasonLabel } from '@/shared/lib/labels';
import { inventoryApi, type Lot } from './api';

const invKey = (sku: string) => ['inventory', sku] as const;

function ReceiveLotModal({ sku, onClose }: { sku: string; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: {
      quantity: '' as number | '',
      unitCost: '' as number | '',
      currency: 'VND',
      expiresAt: dayjs().tz(SHOP_TZ).add(5, 'day').hour(18).minute(0).format('YYYY-MM-DD HH:mm:ss') as
        string | null,
      supplier: '',
    },
    validate: zod4Resolver(
      z.object({
        quantity: z.number({ message: 'Nhập số lượng' }).int().min(1).max(100_000),
        unitCost: z.number({ message: 'Nhập giá nhập' }).min(0),
        currency: z.string().regex(/^[A-Z]{3}$/),
        expiresAt: z
          .string({ message: 'Chọn hạn dùng' })
          .refine((v) => dayjs.tz(v, SHOP_TZ).isAfter(dayjs()), 'Hạn dùng phải ở tương lai'),
        supplier: z.string().max(150),
      }),
    ),
  });
  const save = useMutation({
    mutationFn: (v: typeof form.values) =>
      inventoryApi.receive({
        sku,
        quantity: Number(v.quantity),
        unitCost: Number(v.unitCost),
        currency: v.currency,
        // Giờ người dùng chọn là giờ cửa hàng -> đổi sang Instant UTC cho backend.
        expiresAt: dayjs.tz(v.expiresAt!, SHOP_TZ).toISOString(),
        supplier: v.supplier.trim() || undefined,
      }),
    onSuccess: (lot) => {
      void qc.invalidateQueries({ queryKey: invKey(sku) });
      notifySuccess(`Đã nhập lô ${lot.lotCode}: ${formatNumber(lot.qtyReceived)} cành`);
      onClose();
    },
    onError: (e) => handleFormError(form, e, 'Chưa nhập được lô'),
  });

  return (
    <Modal opened onClose={onClose} title={`Nhập lô mới · ${sku}`}>
      <form noValidate onSubmit={form.onSubmit((v) => save.mutate(v))}>
        <Stack>
          <SimpleGrid cols={2}>
            <NumberInput
              label="Số lượng"
              required
              min={1}
              max={100000}
              allowDecimal={false}
              thousandSeparator="."
              decimalSeparator=","
              {...form.getInputProps('quantity')}
            />
            <NumberInput
              label="Giá nhập / đơn vị"
              required
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              hideControls
              {...form.getInputProps('unitCost')}
            />
          </SimpleGrid>
          <DateTimePicker
            label="Hạn dùng"
            required
            valueFormat="DD/MM/YYYY HH:mm"
            minDate={new Date()}
            {...form.getInputProps('expiresAt')}
          />
          <TextInput label="Nhà cung cấp" maxLength={150} {...form.getInputProps('supplier')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              Nhập kho
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function WasteModal({ lot, onClose }: { lot: Lot; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: {
      quantity: '' as number | '',
      reason: 'DAMAGED' as 'EXPIRED' | 'DAMAGED' | 'OTHER',
      note: '',
    },
    validate: zod4Resolver(
      z.object({
        quantity: z
          .number({ message: 'Nhập số lượng' })
          .int()
          .min(1)
          .max(lot.qtyAvailable, `Lô chỉ còn ${lot.qtyAvailable}`),
        reason: z.enum(['EXPIRED', 'DAMAGED', 'OTHER']),
        note: z.string().max(80),
      }),
    ),
  });
  const save = useMutation({
    mutationFn: (v: typeof form.values) =>
      inventoryApi.waste(lot.lotCode, {
        quantity: Number(v.quantity),
        reason: v.reason,
        note: v.note.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: invKey(lot.sku) });
      notifySuccess(`Đã ghi nhận hoa hỏng ở lô ${lot.lotCode}`);
      onClose();
    },
    onError: (e) => handleFormError(form, e, 'Chưa ghi nhận được'),
  });
  return (
    <Modal opened onClose={onClose} title={`Ghi nhận hoa hỏng · ${lot.lotCode}`}>
      <form noValidate onSubmit={form.onSubmit((v) => save.mutate(v))}>
        <Stack>
          <Text size="sm" c="dimmed">
            Lô còn {formatNumber(lot.qtyAvailable)} cành có thể bán.
          </Text>
          <NumberInput
            label="Số lượng hỏng"
            required
            min={1}
            max={lot.qtyAvailable}
            allowDecimal={false}
            {...form.getInputProps('quantity')}
          />
          <Select
            label="Lý do"
            data={Object.entries(wasteReasonLabel).map(([value, label]) => ({ value, label }))}
            allowDeselect={false}
            {...form.getInputProps('reason')}
          />
          <TextInput label="Ghi chú" maxLength={80} {...form.getInputProps('note')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" color="red" loading={save.isPending}>
              Ghi nhận
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function MovementsDrawer({ lot, onClose }: { lot: Lot | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['inventory', lot?.sku, 'movements', lot?.lotCode],
    queryFn: () => inventoryApi.movements(lot!.lotCode),
    enabled: Boolean(lot),
  });
  return (
    <Drawer
      opened={Boolean(lot)}
      onClose={onClose}
      position="right"
      size="lg"
      title={<Text fw={700}>Sổ cái lô {lot?.lotCode}</Text>}
    >
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Thời điểm</Table.Th>
              <Table.Th>Loại</Table.Th>
              <Table.Th ta="right">Số lượng</Table.Th>
              <Table.Th>Tham chiếu</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {q.data?.map((m, i) => (
              <Table.Tr key={i}>
                <Table.Td>
                  <Text size="xs">{formatDateTime(m.occurredAt)}</Text>
                  {m.actor && (
                    <Text size="xs" c="dimmed">
                      {m.actor}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={movementLabel[m.type]?.color ?? 'gray'}>
                    {movementLabel[m.type]?.label ?? m.type}
                  </Badge>
                </Table.Td>
                <Table.Td ta="right" fw={600} c={m.quantityDelta < 0 ? 'red.7' : 'teal.7'}>
                  {m.quantityDelta > 0 ? '+' : ''}
                  {formatNumber(m.quantityDelta)}
                </Table.Td>
                <Table.Td>
                  <Text size="xs" ff="monospace">
                    {m.reference ?? '—'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </QueryState>
    </Drawer>
  );
}

export function InventoryPage() {
  const { can } = useAuth();
  const canWrite = can('inventory:write');
  const [params, setParams] = useSearchParams();
  const sku = params.get('sku') ?? '';
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [page, setPage] = useState(0);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [wasteLot, setWasteLot] = useState<Lot | null>(null);
  const [ledgerLot, setLedgerLot] = useState<Lot | null>(null);

  // Backend bắt buộc lọc lô theo SKU -> chọn hoa trước.
  const flowers = useQuery({
    queryKey: ['flowers', 'options'],
    queryFn: () => catalogApi.list({ size: 100 }),
    staleTime: 60_000,
  });
  const stock = useQuery({
    queryKey: [...invKey(sku), 'stock'],
    queryFn: () => inventoryApi.stock(sku),
    enabled: Boolean(sku),
  });
  const lots = useQuery({
    queryKey: [...invKey(sku), 'lots', includeEmpty, page],
    queryFn: () => inventoryApi.lots(sku, { includeEmpty, page, size: 20 }),
    enabled: Boolean(sku),
    placeholderData: keepPreviousData,
  });

  const options = (flowers.data?.items ?? []).map((f) => ({ value: f.sku, label: `${f.name} · ${f.sku}` }));

  return (
    <Stack>
      <PageHeader
        title="Tồn kho"
        description="Theo dõi theo lô. Hoa xuất theo FEFO: lô sắp hết hạn được dùng trước."
        actions={
          canWrite &&
          sku && (
            <Button leftSection={<IconPackageImport size={16} />} onClick={() => setReceiveOpen(true)}>
              Nhập lô
            </Button>
          )
        }
      />
      <Select
        label="Chọn hoa"
        placeholder="Gõ tên hoặc SKU…"
        searchable
        clearable
        maw={420}
        nothingFoundMessage="Không tìm thấy"
        data={options}
        value={sku || null}
        onChange={(v) => {
          setPage(0);
          setParams(v ? { sku: v } : {});
        }}
      />

      {!sku ? (
        <Card>
          <EmptyState title="Chọn một loại hoa để xem tồn kho" />
        </Card>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, sm: 3 }}>
            <Card>
              <Text size="sm" c="dimmed">
                Bán được
              </Text>
              <Text fz={30} fw={800} c="teal.7">
                {stock.data ? formatNumber(stock.data.sellable) : '—'}
              </Text>
            </Card>
            <Card>
              <Text size="sm" c="dimmed">
                Đã hết hạn (chưa xử lý)
              </Text>
              <Text fz={30} fw={800} c={stock.data?.expired ? 'orange.7' : 'dark.3'}>
                {stock.data ? formatNumber(stock.data.expired) : '—'}
              </Text>
            </Card>
          </SimpleGrid>

          <Card p={0}>
            <Group justify="space-between" p="md">
              <Text fw={700}>Các lô hàng</Text>
              <Switch
                label="Hiện cả lô đã hết"
                checked={includeEmpty}
                onChange={(e) => setIncludeEmpty(e.currentTarget.checked)}
              />
            </Group>
            <QueryState isLoading={lots.isLoading} error={lots.error} onRetry={() => lots.refetch()}>
              {lots.data?.items.length === 0 ? (
                <EmptyState
                  title="Chưa có lô nào"
                  description={canWrite ? 'Bấm “Nhập lô” để thêm hàng vào kho.' : undefined}
                />
              ) : (
                <Table.ScrollContainer minWidth={760}>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Mã lô</Table.Th>
                        <Table.Th ta="right">Còn / Nhập</Table.Th>
                        <Table.Th>Hạn dùng</Table.Th>
                        <Table.Th ta="right">Giá nhập</Table.Th>
                        <Table.Th>Nhà cung cấp</Table.Th>
                        <Table.Th w={50} />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lots.data?.items.map((l) => {
                        const soon = !l.expired && dayjs(l.expiresAt).diff(dayjs(), 'hour') < 24;
                        return (
                          <Table.Tr key={l.lotCode}>
                            <Table.Td>
                              <Text size="sm" ff="monospace" fw={600}>
                                {l.lotCode}
                              </Text>
                              <Text size="xs" c="dimmed">
                                Nhập {formatDateTime(l.receivedAt)}
                              </Text>
                            </Table.Td>
                            <Table.Td ta="right">
                              <Text size="sm" fw={600} span>
                                {formatNumber(l.qtyAvailable)}
                              </Text>
                              <Text size="sm" c="dimmed" span>
                                {' '}
                                / {formatNumber(l.qtyReceived)}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6}>
                                <Text size="sm">{formatDateTime(l.expiresAt)}</Text>
                                {l.expired ? (
                                  <Badge size="xs" color="gray">
                                    Hết hạn
                                  </Badge>
                                ) : soon ? (
                                  <Badge size="xs" color="orange" variant="light">
                                    Dưới 24h
                                  </Badge>
                                ) : null}
                              </Group>
                            </Table.Td>
                            <Table.Td ta="right">{formatMoney(l.unitCost, l.currency)}</Table.Td>
                            <Table.Td>{l.supplier ?? '—'}</Table.Td>
                            <Table.Td>
                              <Menu position="bottom-end">
                                <Menu.Target>
                                  <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    aria-label={`Thao tác lô ${l.lotCode}`}
                                  >
                                    <IconDots size={16} />
                                  </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                  <Menu.Item
                                    leftSection={<IconHistory size={16} />}
                                    onClick={() => setLedgerLot(l)}
                                  >
                                    Xem sổ cái
                                  </Menu.Item>
                                  {canWrite && l.qtyAvailable > 0 && (
                                    <Menu.Item
                                      color="red"
                                      leftSection={<IconTrashX size={16} />}
                                      onClick={() => setWasteLot(l)}
                                    >
                                      Ghi nhận hoa hỏng
                                    </Menu.Item>
                                  )}
                                </Menu.Dropdown>
                              </Menu>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </QueryState>
          </Card>
          <PageBar page={page} totalPages={lots.data?.totalPages ?? 0} onChange={setPage} />
        </>
      )}

      {receiveOpen && sku && <ReceiveLotModal sku={sku} onClose={() => setReceiveOpen(false)} />}
      {wasteLot && <WasteModal lot={wasteLot} onClose={() => setWasteLot(null)} />}
      <MovementsDrawer lot={ledgerLot} onClose={() => setLedgerLot(null)} />
    </Stack>
  );
}
