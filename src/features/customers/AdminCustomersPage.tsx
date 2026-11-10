import {
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconSearch, IconUserOff, IconUserPlus } from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthProvider';
import { confirmAction, EmptyState, PageBar, PageHeader, QueryState } from '@/shared/ui';
import { handleFormError, notifyError, notifySuccess } from '@/shared/lib/errors';
import { dayjs, formatDateTime } from '@/shared/lib/format';
import { emptyToUndefined, optionalEmail, phoneSchema } from '@/shared/lib/validation';
import { AddressBook } from './AddressBook';
import { customerAddresses, customerApi } from './api';
import { CustomerProfileForm } from './CustomerProfileForm';

function CreateCustomerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const form = useForm({
    initialValues: { fullName: '', phone: '', email: '', dateOfBirth: null as string | null },
    validate: zod4Resolver(
      z.object({
        fullName: z.string().trim().min(1, 'Nhập họ tên').max(150),
        phone: phoneSchema,
        email: optionalEmail,
        dateOfBirth: z.string().nullable(),
      }),
    ),
  });
  const save = useMutation({
    mutationFn: (v: typeof form.values) =>
      customerApi.create(
        emptyToUndefined({
          fullName: v.fullName.trim(),
          phone: v.phone.trim(),
          email: v.email.trim(),
          dateOfBirth: v.dateOfBirth ?? undefined,
        }),
      ),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      notifySuccess(`Đã tạo hồ sơ ${c.customerCode}`);
      navigate(`/admin/customers/${c.id}`);
    },
    onError: (e) => handleFormError(form, e, 'Chưa tạo được hồ sơ'),
  });
  return (
    <Modal opened onClose={onClose} title="Tạo hồ sơ khách hàng">
      <form noValidate onSubmit={form.onSubmit((v) => save.mutate(v))}>
        <Stack>
          <TextInput label="Họ và tên" required {...form.getInputProps('fullName')} />
          <TextInput label="Số điện thoại" required inputMode="tel" {...form.getInputProps('phone')} />
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label="Email" type="email" {...form.getInputProps('email')} />
            <DateInput
              label="Ngày sinh"
              valueFormat="DD/MM/YYYY"
              clearable
              maxDate={dayjs().subtract(1, 'day').toDate()}
              {...form.getInputProps('dateOfBirth')}
            />
          </SimpleGrid>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              Tạo hồ sơ
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function AdminCustomersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const phoneValid = phoneSchema.safeParse(phoneInput).success;

  const q = useQuery({
    queryKey: ['customers', 'list', phone, page],
    queryFn: () => customerApi.search(phone, { page, size: 20 }),
    placeholderData: keepPreviousData,
  });

  return (
    <Stack>
      <PageHeader
        title="Khách hàng"
        description="Danh sách đã che số điện thoại và email. Mở chi tiết để xem đầy đủ."
        actions={
          can('customer:create') && (
            <Button leftSection={<IconUserPlus size={16} />} onClick={() => setCreateOpen(true)}>
              Tạo hồ sơ
            </Button>
          )
        }
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setPhone(phoneInput.trim() || undefined);
        }}
      >
        <Group align="flex-end">
          <TextInput
            label="Tìm theo số điện thoại"
            description="Nhập đủ 10 số (so khớp chính xác để bảo vệ dữ liệu khách)"
            placeholder="0901234567"
            inputMode="tel"
            leftSection={<IconSearch size={16} />}
            w={300}
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.currentTarget.value)}
            error={phoneInput && !phoneValid ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0' : undefined}
          />
          <Button type="submit" disabled={Boolean(phoneInput) && !phoneValid}>
            Tìm
          </Button>
          {phone && (
            <Button
              variant="subtle"
              onClick={() => {
                setPhone(undefined);
                setPhoneInput('');
              }}
            >
              Xem tất cả
            </Button>
          )}
        </Group>
      </form>
      <Card p={0}>
        <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {q.data?.items.length === 0 ? (
            <EmptyState title={phone ? 'Không có khách nào dùng số này' : 'Chưa có khách hàng'} />
          ) : (
            <Table.ScrollContainer minWidth={640}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mã khách</Table.Th>
                    <Table.Th>Họ tên</Table.Th>
                    <Table.Th>Điện thoại</Table.Th>
                    <Table.Th>Email</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {q.data?.items.map((c) => (
                    <Table.Tr
                      key={c.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/admin/customers/${c.id}`)}
                    >
                      <Table.Td ff="monospace" fz="sm">
                        {c.customerCode}
                      </Table.Td>
                      <Table.Td fw={600}>{c.fullName}</Table.Td>
                      <Table.Td>{c.maskedPhone}</Table.Td>
                      <Table.Td c="dimmed">{c.maskedEmail ?? '—'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </QueryState>
      </Card>
      <PageBar page={page} totalPages={q.data?.totalPages ?? 0} onChange={setPage} />
      {createOpen && <CreateCustomerModal onClose={() => setCreateOpen(false)} />}
    </Stack>
  );
}

export function AdminCustomerDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const key = ['customers', id, 'detail'];
  const q = useQuery({ queryKey: key, queryFn: () => customerApi.get(id), enabled: Number.isFinite(id) });
  const canWrite = can('customer:write');

  const deactivate = useMutation({
    mutationFn: () => customerApi.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customers'] });
      notifySuccess('Đã ngừng hoạt động hồ sơ khách');
      navigate('/admin/customers');
    },
    onError: (e) => notifyError(e),
  });

  const c = q.data;
  return (
    <Stack>
      <Breadcrumbs>
        <Anchor component={Link} to="/admin/customers" size="sm">
          Khách hàng
        </Anchor>
        <Text size="sm">{c?.customerCode ?? '…'}</Text>
      </Breadcrumbs>
      <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
        {c && (
          <>
            <PageHeader
              title={c.fullName}
              description={
                <Group gap="xs" component="span">
                  <span>{c.customerCode}</span>
                  <Badge size="sm" color={c.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light">
                    {c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                  <span>· Tạo {formatDateTime(c.createdAt)}</span>
                </Group>
              }
              actions={
                can('customer:deactivate') &&
                c.status === 'ACTIVE' && (
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconUserOff size={16} />}
                    loading={deactivate.isPending}
                    onClick={() =>
                      confirmAction({
                        title: 'Ngừng hoạt động khách hàng?',
                        message: `Hồ sơ ${c.fullName} (${c.customerCode}) sẽ bị ẩn khỏi danh sách. Dữ liệu không bị xóa.`,
                        confirmLabel: 'Ngừng hoạt động',
                        danger: true,
                        onConfirm: () => deactivate.mutate(),
                      })
                    }
                  >
                    Ngừng hoạt động
                  </Button>
                )
              }
            />
            <Tabs defaultValue="profile" keepMounted={false}>
              <Tabs.List mb="lg">
                <Tabs.Tab value="profile">Hồ sơ</Tabs.Tab>
                <Tabs.Tab value="addresses">Sổ địa chỉ</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="profile">
                <Card>
                  <CustomerProfileForm
                    key={c.version}
                    customer={c}
                    readOnly={!canWrite}
                    onSave={async (body) => {
                      const updated = await customerApi.update(id, body);
                      qc.setQueryData(key, updated);
                      return updated;
                    }}
                    onReload={() => q.refetch()}
                  />
                </Card>
              </Tabs.Panel>
              <Tabs.Panel value="addresses">
                <AddressBook book={customerAddresses(id)} readOnly={!canWrite} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </QueryState>
    </Stack>
  );
}
