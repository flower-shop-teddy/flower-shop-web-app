import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDots, IconPencil, IconPlus, IconStar, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { confirmAction, EmptyState, QueryState } from '@/shared/ui';
import { handleFormError, notifyError, notifySuccess } from '@/shared/lib/errors';
import { phoneSchema } from '@/shared/lib/validation';
import { MAX_ADDRESSES, type Address, type AddressBookApi, type AddressInput } from './api';

const addressSchema = z.object({
  recipientName: z.string().trim().min(1, 'Nhập tên người nhận').max(150),
  recipientPhone: phoneSchema,
  addressLine: z.string().trim().min(1, 'Nhập số nhà, tên đường').max(255),
  ward: z.string().trim().min(1, 'Nhập phường / xã').max(100),
  province: z.string().trim().min(1, 'Nhập tỉnh / thành phố').max(100),
  note: z.string().max(500),
});

export function formatAddress(a: { addressLine: string; ward: string; province: string }) {
  return `${a.addressLine}, ${a.ward}, ${a.province}`;
}

export function AddressFormModal({
  book,
  opened,
  onClose,
  editing,
  onSaved,
}: {
  book: AddressBookApi;
  opened: boolean;
  onClose: () => void;
  editing?: Address | null;
  onSaved?: (a: Address) => void;
}) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: {
      recipientName: editing?.recipientName ?? '',
      recipientPhone: editing?.recipientPhone ?? '',
      addressLine: editing?.addressLine ?? '',
      ward: editing?.ward ?? '',
      province: editing?.province ?? '',
      note: editing?.note ?? '',
    },
    validate: zod4Resolver(addressSchema),
  });

  const save = useMutation({
    mutationFn: (v: AddressInput) =>
      editing ? book.update(editing.id, { ...v, version: editing.version }) : book.create(v),
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: book.key });
      notifySuccess(editing ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ');
      onSaved?.(a);
      onClose();
    },
    onError: (e) => handleFormError(form, e),
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ nhận hoa'}
      size="lg"
    >
      <form
        noValidate
        onSubmit={form.onSubmit((v) => save.mutate({ ...v, note: v.note.trim() || undefined }))}
      >
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Người nhận" required {...form.getInputProps('recipientName')} />
            <TextInput
              label="Số điện thoại"
              required
              inputMode="tel"
              placeholder="0901234567"
              {...form.getInputProps('recipientPhone')}
            />
          </SimpleGrid>
          <TextInput label="Số nhà, tên đường" required {...form.getInputProps('addressLine')} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Phường / Xã" required {...form.getInputProps('ward')} />
            <TextInput label="Tỉnh / Thành phố" required {...form.getInputProps('province')} />
          </SimpleGrid>
          <Textarea
            label="Ghi chú cho shipper"
            autosize
            minRows={2}
            maxLength={500}
            {...form.getInputProps('note')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              Lưu địa chỉ
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function AddressCard({ a, actions }: { a: Address; actions?: ReactNode }) {
  return (
    <Card
      padding="md"
      shadow="none"
      style={a.defaultAddress ? { borderColor: 'var(--mantine-color-pink-3)' } : undefined}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4} style={{ minWidth: 0 }}>
          <Group gap="xs">
            <Text fw={600}>{a.recipientName}</Text>
            <Text c="dimmed" size="sm">
              {a.recipientPhone}
            </Text>
            {a.defaultAddress && (
              <Badge size="sm" variant="light">
                Mặc định
              </Badge>
            )}
          </Group>
          <Text size="sm">{formatAddress(a)}</Text>
          {a.note && (
            <Text size="xs" c="dimmed">
              Ghi chú: {a.note}
            </Text>
          )}
        </Stack>
        {actions}
      </Group>
    </Card>
  );
}

/** Sổ địa chỉ đầy đủ thao tác, dùng cho cả khách (/me) và nhân viên (theo id khách). */
export function AddressBook({ book, readOnly = false }: { book: AddressBookApi; readOnly?: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: book.key, queryFn: book.list });
  const [modal, setModal] = useState<{ open: boolean; editing: Address | null }>({
    open: false,
    editing: null,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: book.key });

  const setDefault = useMutation({
    mutationFn: book.setDefault,
    onSuccess: refresh,
    onError: (e) => notifyError(e),
  });
  const remove = useMutation({
    mutationFn: book.remove,
    onSuccess: () => {
      void refresh();
      notifySuccess('Đã xóa địa chỉ');
    },
    onError: (e) => notifyError(e),
  });

  const list = q.data ?? [];
  const full = list.length >= MAX_ADDRESSES;

  return (
    <Stack>
      <Group justify="space-between">
        <Text c="dimmed" size="sm">
          {list.length}/{MAX_ADDRESSES} địa chỉ
        </Text>
        {!readOnly && (
          <Button
            leftSection={<IconPlus size={16} />}
            variant="light"
            disabled={full}
            title={full ? `Tối đa ${MAX_ADDRESSES} địa chỉ` : undefined}
            onClick={() => setModal({ open: true, editing: null })}
          >
            Thêm địa chỉ
          </Button>
        )}
      </Group>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {list.length === 0 ? (
          <EmptyState
            title="Chưa có địa chỉ nào"
            description="Thêm địa chỉ người nhận để đặt hoa nhanh hơn."
          />
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {list.map((a) => (
              <AddressCard
                key={a.id}
                a={a}
                actions={
                  readOnly ? null : (
                    <Menu position="bottom-end" withinPortal>
                      <Menu.Target>
                        <ActionIcon variant="subtle" color="gray" aria-label="Thao tác địa chỉ">
                          <IconDots size={18} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconPencil size={16} />}
                          onClick={() => setModal({ open: true, editing: a })}
                        >
                          Sửa
                        </Menu.Item>
                        {!a.defaultAddress && (
                          <Menu.Item
                            leftSection={<IconStar size={16} />}
                            onClick={() => setDefault.mutate(a.id)}
                          >
                            Đặt làm mặc định
                          </Menu.Item>
                        )}
                        <Menu.Item
                          color="red"
                          leftSection={<IconTrash size={16} />}
                          onClick={() =>
                            confirmAction({
                              title: 'Xóa địa chỉ?',
                              message: formatAddress(a),
                              confirmLabel: 'Xóa',
                              danger: true,
                              onConfirm: () => remove.mutate(a.id),
                            })
                          }
                        >
                          Xóa
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  )
                }
              />
            ))}
          </SimpleGrid>
        )}
      </QueryState>
      {modal.open && (
        <AddressFormModal
          key={modal.editing?.id ?? 'new'}
          book={book}
          opened
          editing={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
        />
      )}
    </Stack>
  );
}
