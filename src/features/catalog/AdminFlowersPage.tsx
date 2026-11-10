import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconPencil, IconPlus, IconSearch, IconArchive } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { confirmAction, EmptyState, FlowerThumb, PageBar, PageHeader, QueryState } from '@/shared/ui';
import { ErrorCodes, isApiError } from '@/shared/api/ApiError';
import { handleFormError, notifyError, notifySuccess } from '@/shared/lib/errors';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { categoryInfo, FLOWER_CATEGORIES, type FlowerCategory } from '@/shared/lib/labels';
import { skuSchema } from '@/shared/lib/validation';
import { catalogApi, catalogKeys, type Flower } from './api';

const categoryOptions = FLOWER_CATEGORIES.map((c) => ({
  value: c,
  label: `${categoryInfo[c].emoji} ${categoryInfo[c].label}`,
}));

const priceSchema = z
  .number({ message: 'Nhập giá bán' })
  .positive('Giá phải lớn hơn 0')
  .refine(
    (v) => /^\d{1,15}(\.\d{1,4})?$/.test(String(v)),
    'Tối đa 15 chữ số phần nguyên, 4 chữ số thập phân',
  );

const flowerSchema = z.object({
  sku: skuSchema,
  name: z.string().trim().min(1, 'Nhập tên hoa').max(150),
  description: z.string().max(1000),
  category: z.enum(FLOWER_CATEGORIES, { message: 'Chọn loại hoa' }),
  unitPrice: priceSchema,
  currency: z.string().regex(/^[A-Z]{3}$/, 'Mã tiền tệ 3 chữ cái'),
});

function FlowerFormModal({ editing, onClose }: { editing: Flower | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = Boolean(editing);
  const form = useForm({
    initialValues: {
      sku: editing?.sku ?? '',
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      category: (editing?.category ?? null) as FlowerCategory | null,
      unitPrice: (editing ? Number(editing.unitPrice) : '') as number | '',
      currency: editing?.currency ?? 'VND',
    },
    validate: zod4Resolver(flowerSchema),
    transformValues: (v) => ({ ...v, sku: v.sku.trim().toUpperCase() }),
  });

  const save = useMutation({
    mutationFn: async (v: z.infer<typeof flowerSchema>) => {
      const base = {
        name: v.name.trim(),
        description: v.description.trim() || undefined,
        category: v.category,
        unitPrice: v.unitPrice,
      };
      if (!editing) return catalogApi.create({ ...base, sku: v.sku, currency: v.currency });
      // Gửi đúng version lúc mở form: nếu người khác sửa trong lúc này, server trả 409 thay vì ghi đè.
      return catalogApi.update(editing.id, { ...base, version: editing.version });
    },
    onSuccess: (f) => {
      void qc.invalidateQueries({ queryKey: catalogKeys.all });
      notifySuccess(isEdit ? `Đã cập nhật ${f.name}` : `Đã thêm ${f.name} vào danh mục`);
      onClose();
    },
    onError: (e) => {
      handleFormError(form, e, 'Chưa lưu được');
      if (isApiError(e) && e.is(ErrorCodes.OPTIMISTIC_LOCK)) {
        void qc.invalidateQueries({ queryKey: catalogKeys.all });
        onClose();
      }
    },
  });

  return (
    <Modal opened onClose={onClose} title={isEdit ? `Sửa ${editing?.name}` : 'Thêm hoa mới'} size="lg">
      <form noValidate onSubmit={form.onSubmit((v) => save.mutate(v as z.infer<typeof flowerSchema>))}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="SKU"
              required
              disabled={isEdit}
              description={isEdit ? 'Không đổi được SKU' : 'VD: ROSE-RED-01'}
              {...form.getInputProps('sku')}
              onChange={(e) => form.setFieldValue('sku', e.currentTarget.value.toUpperCase())}
            />
            <Select
              label="Loại hoa"
              required
              data={categoryOptions}
              allowDeselect={false}
              {...form.getInputProps('category')}
            />
          </SimpleGrid>
          <TextInput label="Tên hoa" required {...form.getInputProps('name')} />
          <Textarea
            label="Mô tả"
            autosize
            minRows={3}
            maxLength={1000}
            {...form.getInputProps('description')}
          />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <NumberInput
              label="Giá bán"
              required
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              decimalScale={4}
              hideControls
              {...form.getInputProps('unitPrice')}
            />
            <TextInput
              label="Tiền tệ"
              required
              disabled={isEdit}
              maxLength={3}
              {...form.getInputProps('currency')}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              {isEdit ? 'Lưu thay đổi' : 'Thêm hoa'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function AdminFlowersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: Flower | null }>({
    open: false,
    editing: null,
  });

  const q = useQuery({
    queryKey: catalogKeys.list({ page, size: 50 }),
    queryFn: () => catalogApi.list({ page, size: 50 }),
    placeholderData: keepPreviousData,
  });

  const deactivate = useMutation({
    mutationFn: (f: Flower) => catalogApi.deactivate(f.id),
    onSuccess: (_, f) => {
      void qc.invalidateQueries({ queryKey: catalogKeys.all });
      notifySuccess(`${f.name} đã ngừng kinh doanh`);
    },
    onError: (e) => notifyError(e),
  });

  // Mở form sửa với bản mới nhất (có version mới nhất) thay vì bản trong danh sách có thể đã cũ.
  const openEdit = async (f: Flower) => {
    try {
      const fresh = await qc.fetchQuery({
        queryKey: catalogKeys.detail(f.id),
        queryFn: () => catalogApi.get(f.id),
        staleTime: 0,
      });
      setModal({ open: true, editing: fresh });
    } catch (e) {
      notifyError(e);
    }
  };

  const items = useMemo(() => {
    const s = search.trim().toLowerCase();
    const all = q.data?.items ?? [];
    return s ? all.filter((f) => f.name.toLowerCase().includes(s) || f.sku.toLowerCase().includes(s)) : all;
  }, [q.data, search]);

  return (
    <Stack>
      <PageHeader
        title="Danh mục hoa"
        description="Các hoa đang bán. Ngừng kinh doanh là ẩn khỏi cửa hàng, không xóa dữ liệu."
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setModal({ open: true, editing: null })}
          >
            Thêm hoa
          </Button>
        }
      />
      <TextInput
        placeholder="Lọc theo tên hoặc SKU trong trang này…"
        leftSection={<IconSearch size={16} />}
        maw={360}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
      />
      <Card p={0}>
        <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {items.length === 0 ? (
            <EmptyState title="Chưa có hoa nào" />
          ) : (
            <Table.ScrollContainer minWidth={760}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Hoa</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Loại</Table.Th>
                    <Table.Th ta="right">Giá bán</Table.Th>
                    <Table.Th>Cập nhật</Table.Th>
                    <Table.Th w={90} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {items.map((f) => (
                    <Table.Tr key={f.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <div style={{ width: 40, flexShrink: 0 }}>
                            <FlowerThumb category={f.category} size={40} radius="sm" />
                          </div>
                          <Text size="sm" fw={600}>
                            {f.name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {f.sku}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="sm">
                          {categoryInfo[f.category]?.label ?? f.category}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">{formatMoney(f.unitPrice, f.currency)}</Table.Td>
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {formatDateTime(f.updatedAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label="Sửa">
                            <ActionIcon
                              variant="subtle"
                              onClick={() => openEdit(f)}
                              aria-label={`Sửa ${f.name}`}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Ngừng kinh doanh">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              aria-label={`Ngừng kinh doanh ${f.name}`}
                              onClick={() =>
                                confirmAction({
                                  title: 'Ngừng kinh doanh?',
                                  message: `${f.name} (${f.sku}) sẽ không còn hiện trên cửa hàng và không đặt được nữa.`,
                                  confirmLabel: 'Ngừng kinh doanh',
                                  danger: true,
                                  onConfirm: () => deactivate.mutate(f),
                                })
                              }
                            >
                              <IconArchive size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </QueryState>
      </Card>
      <PageBar page={page} totalPages={q.data?.totalPages ?? 0} onChange={setPage} />
      {modal.open && (
        <FlowerFormModal
          key={modal.editing?.id ?? 'new'}
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}
    </Stack>
  );
}
