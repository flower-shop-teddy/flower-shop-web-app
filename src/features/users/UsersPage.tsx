import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  CopyButton,
  Group,
  Menu,
  Modal,
  MultiSelect,
  SegmentedControl,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import {
  IconCheck,
  IconCopy,
  IconDots,
  IconKey,
  IconLock,
  IconLockOpen,
  IconShieldCheck,
  IconUserCheck,
  IconUserOff,
  IconUserPlus,
} from '@tabler/icons-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@/features/auth/AuthProvider';
import type { UserType } from '@/features/auth/api';
import { confirmAction, EmptyState, PageBar, PageHeader, QueryState } from '@/shared/ui';
import { handleFormError, notifyError, notifySuccess } from '@/shared/lib/errors';
import { formatDateTime } from '@/shared/lib/format';
import { userStatusInfo, userTypeLabel } from '@/shared/lib/labels';
import { usersApi, type Role, type TemporaryPassword, type UserAccount } from './api';

const USERS_KEY = ['users'] as const;

/** Mật khẩu tạm chỉ hiện MỘT lần ở đây; không lưu vào cache, storage hay log. */
function TempPasswordModal({ result, onClose }: { result: TemporaryPassword; onClose: () => void }) {
  return (
    <Modal opened onClose={onClose} title="Mật khẩu tạm" closeOnClickOutside={false}>
      <Stack>
        <Text size="sm">
          Tài khoản <b>{result.user.username}</b>. Hãy gửi mật khẩu này cho nhân viên qua kênh an toàn. Họ sẽ
          phải đổi mật khẩu ở lần đăng nhập đầu tiên.
        </Text>
        <Group gap="xs" wrap="nowrap">
          <Code fz="lg" p="sm" style={{ flex: 1, letterSpacing: 1 }}>
            {result.temporaryPassword}
          </Code>
          <CopyButton value={result.temporaryPassword} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Đã chép' : 'Chép'}>
                <ActionIcon
                  size="lg"
                  variant="light"
                  color={copied ? 'teal' : 'pink'}
                  onClick={copy}
                  aria-label="Chép mật khẩu"
                >
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Alert color="yellow" variant="light">
          Đóng hộp thoại này là không xem lại được. Quên thì dùng “Đặt lại mật khẩu”.
        </Alert>
        <Group justify="flex-end">
          <Button onClick={onClose}>Tôi đã lưu lại</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function roleOptions(roles: Role[] | undefined) {
  return (roles ?? []).map((r) => ({ value: r.code, label: `${r.name} (${r.code})` }));
}

function CreateStaffModal({
  roles,
  onClose,
  onCreated,
}: {
  roles?: Role[];
  onClose: () => void;
  onCreated: (r: TemporaryPassword) => void;
}) {
  const qc = useQueryClient();
  const form = useForm({
    initialValues: { username: '', roles: [] as string[] },
    validate: zod4Resolver(
      z.object({
        username: z
          .string()
          .regex(/^[a-zA-Z][a-zA-Z0-9._]{2,49}$/, '3–50 ký tự, bắt đầu bằng chữ, chỉ gồm chữ, số, dấu . _'),
        roles: z.array(z.string()).min(1, 'Chọn ít nhất một vai trò').max(10),
      }),
    ),
  });
  const save = useMutation({
    mutationFn: (v: typeof form.values) => usersApi.createStaff(v.username.trim(), v.roles),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      onCreated(r);
    },
    onError: (e) => handleFormError(form, e, 'Chưa tạo được tài khoản'),
  });
  return (
    <Modal opened onClose={onClose} title="Tạo tài khoản nhân viên">
      <form noValidate onSubmit={form.onSubmit((v) => save.mutate(v))}>
        <Stack>
          <TextInput label="Tên đăng nhập" required autoComplete="off" {...form.getInputProps('username')} />
          <MultiSelect label="Vai trò" required data={roleOptions(roles)} {...form.getInputProps('roles')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" loading={save.isPending}>
              Tạo tài khoản
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function AssignRolesModal({
  user,
  roles,
  onClose,
}: {
  user: UserAccount;
  roles?: Role[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState<string[]>(user.roles);
  const save = useMutation({
    mutationFn: () => usersApi.assignRoles(user.publicId, value),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      notifySuccess(`Đã cập nhật vai trò của ${user.username}. Áp dụng từ lần cấp token kế tiếp.`);
      onClose();
    },
    onError: (e) => notifyError(e),
  });
  return (
    <Modal opened onClose={onClose} title={`Vai trò của ${user.username}`}>
      <Stack>
        <MultiSelect
          data={roleOptions(roles)}
          value={value}
          onChange={setValue}
          error={value.length === 0 ? 'Chọn ít nhất một vai trò' : undefined}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={() => save.mutate()} disabled={value.length === 0} loading={save.isPending}>
            Lưu
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function UserStatus({ u }: { u: UserAccount }) {
  const s = userStatusInfo[u.status] ?? { label: u.status, color: 'gray' };
  return (
    <Group gap={4}>
      <Badge size="sm" variant="light" color={s.color}>
        {s.label}
      </Badge>
      {u.locked && (
        <Tooltip
          label={u.lockedUntil ? `Tự mở lúc ${formatDateTime(u.lockedUntil)}` : 'Sai mật khẩu nhiều lần'}
        >
          <Badge size="sm" color="red" variant="light" leftSection={<IconLock size={10} />}>
            Tạm khóa
          </Badge>
        </Tooltip>
      )}
      {u.passwordChangeRequired && (
        <Badge size="sm" color="yellow" variant="outline">
          Chờ đổi mật khẩu
        </Badge>
      )}
    </Group>
  );
}

function AccountsTab({ roles }: { roles?: Role[] }) {
  const { can, me } = useAuth();
  const qc = useQueryClient();
  const canWrite = can('user:write');
  const canAssign = can('role:assign');
  const [type, setType] = useState<UserType>('STAFF');
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<UserAccount | null>(null);
  const [temp, setTemp] = useState<TemporaryPassword | null>(null);

  const q = useQuery({
    queryKey: [...USERS_KEY, type, page],
    queryFn: () => usersApi.list({ type, page, size: 20 }),
    placeholderData: keepPreviousData,
  });

  const action = useMutation({
    mutationFn: ({ u, op }: { u: UserAccount; op: 'disable' | 'enable' | 'unlock' }) =>
      usersApi[op](u.publicId),
    onSuccess: (u, { op }) => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      notifySuccess(
        { disable: 'Đã khóa tài khoản', enable: 'Đã mở lại tài khoản', unlock: 'Đã mở khóa đăng nhập' }[op] +
          ` ${u.username ?? ''}`,
      );
    },
    onError: (e) => notifyError(e),
  });
  const reset = useMutation({
    mutationFn: (u: UserAccount) => usersApi.resetPassword(u.publicId),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: USERS_KEY });
      setTemp(r);
    },
    onError: (e) => notifyError(e),
  });

  return (
    <Stack>
      <Group justify="space-between">
        <SegmentedControl
          value={type}
          onChange={(v) => {
            setType(v as UserType);
            setPage(0);
          }}
          data={(['STAFF', 'CUSTOMER', 'SERVICE'] as const).map((t) => ({
            value: t,
            label: userTypeLabel[t] ?? t,
          }))}
        />
        {canWrite && (
          <Button leftSection={<IconUserPlus size={16} />} onClick={() => setCreateOpen(true)}>
            Tạo nhân viên
          </Button>
        )}
      </Group>
      <Card p={0}>
        <QueryState isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()}>
          {q.data?.items.length === 0 ? (
            <EmptyState title="Không có tài khoản nào" />
          ) : (
            <Table.ScrollContainer minWidth={820}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Tài khoản</Table.Th>
                    <Table.Th>Vai trò</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                    <Table.Th>Đăng nhập gần nhất</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {q.data?.items.map((u) => {
                    const self = u.publicId === me?.publicId;
                    const showMenu = (canWrite || canAssign) && u.userType === 'STAFF' && !self;
                    return (
                      <Table.Tr key={u.publicId}>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {u.username ?? u.phoneMasked ?? '—'}{' '}
                            {self && (
                              <Badge size="xs" variant="outline">
                                Bạn
                              </Badge>
                            )}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Tạo {formatDateTime(u.createdAt)}
                            {u.createdBy ? ` bởi ${u.createdBy}` : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            {u.roles.map((r) => (
                              <Badge key={r} size="sm" variant="dot">
                                {r}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <UserStatus u={u} />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDateTime(u.lastLoginAt)}</Text>
                        </Table.Td>
                        <Table.Td>
                          {showMenu && (
                            <Menu position="bottom-end" width={210}>
                              <Menu.Target>
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  aria-label={`Thao tác ${u.username}`}
                                >
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                {canAssign && (
                                  <Menu.Item
                                    leftSection={<IconShieldCheck size={16} />}
                                    onClick={() => setAssigning(u)}
                                  >
                                    Gán vai trò
                                  </Menu.Item>
                                )}
                                {canWrite && u.locked && (
                                  <Menu.Item
                                    leftSection={<IconLockOpen size={16} />}
                                    onClick={() => action.mutate({ u, op: 'unlock' })}
                                  >
                                    Mở khóa đăng nhập
                                  </Menu.Item>
                                )}
                                {canWrite && (
                                  <Menu.Item
                                    leftSection={<IconKey size={16} />}
                                    onClick={() =>
                                      confirmAction({
                                        title: 'Đặt lại mật khẩu?',
                                        message: `Mật khẩu hiện tại của ${u.username} sẽ hết hiệu lực và mọi phiên đăng nhập bị thu hồi.`,
                                        confirmLabel: 'Đặt lại',
                                        onConfirm: () => reset.mutate(u),
                                      })
                                    }
                                  >
                                    Đặt lại mật khẩu
                                  </Menu.Item>
                                )}
                                {canWrite &&
                                  (u.status === 'DISABLED' ? (
                                    <Menu.Item
                                      leftSection={<IconUserCheck size={16} />}
                                      onClick={() => action.mutate({ u, op: 'enable' })}
                                    >
                                      Mở lại tài khoản
                                    </Menu.Item>
                                  ) : (
                                    <Menu.Item
                                      color="red"
                                      leftSection={<IconUserOff size={16} />}
                                      onClick={() =>
                                        confirmAction({
                                          title: 'Khóa tài khoản?',
                                          message: `${u.username} sẽ không đăng nhập được cho tới khi được mở lại.`,
                                          confirmLabel: 'Khóa',
                                          danger: true,
                                          onConfirm: () => action.mutate({ u, op: 'disable' }),
                                        })
                                      }
                                    >
                                      Khóa tài khoản
                                    </Menu.Item>
                                  ))}
                              </Menu.Dropdown>
                            </Menu>
                          )}
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
      <PageBar page={page} totalPages={q.data?.totalPages ?? 0} onChange={setPage} />

      {createOpen && (
        <CreateStaffModal
          roles={roles}
          onClose={() => setCreateOpen(false)}
          onCreated={(r) => {
            setCreateOpen(false);
            setTemp(r);
          }}
        />
      )}
      {assigning && <AssignRolesModal user={assigning} roles={roles} onClose={() => setAssigning(null)} />}
      {temp && <TempPasswordModal result={temp} onClose={() => setTemp(null)} />}
    </Stack>
  );
}

function RolesTab({ roles, isLoading, error }: { roles?: Role[]; isLoading: boolean; error: unknown }) {
  return (
    <QueryState isLoading={isLoading} error={error}>
      <Stack>
        {roles?.map((r) => (
          <Card key={r.code}>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <Text fw={700}>{r.name}</Text>
                <Code>{r.code}</Code>
                {r.system && (
                  <Badge size="xs" variant="outline" color="gray">
                    Hệ thống
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {r.permissions.length} quyền
              </Text>
            </Group>
            <Group gap={6}>
              {r.permissions.length === 0 ? (
                <Text size="sm" c="dimmed">
                  Không có quyền quản trị (chỉ dùng chức năng của chính mình)
                </Text>
              ) : (
                r.permissions.map((p) => (
                  <Badge key={p} size="sm" variant="light" color="mint" tt="none">
                    {p}
                  </Badge>
                ))
              )}
            </Group>
          </Card>
        ))}
      </Stack>
    </QueryState>
  );
}

export function UsersPage() {
  const { can } = useAuth();
  const canRoles = can('role:read');
  const canUsers = can('user:read');
  const roles = useQuery({
    queryKey: ['roles'],
    queryFn: usersApi.roles,
    enabled: canRoles,
    staleTime: 5 * 60_000,
  });

  return (
    <Stack>
      <PageHeader
        title="Nhân viên & phân quyền"
        description="Tài khoản đăng nhập, vai trò và quyền của từng vai trò."
      />
      <Tabs defaultValue={canUsers ? 'accounts' : 'roles'} keepMounted={false}>
        <Tabs.List mb="lg">
          {canUsers && <Tabs.Tab value="accounts">Tài khoản</Tabs.Tab>}
          {canRoles && <Tabs.Tab value="roles">Vai trò & quyền</Tabs.Tab>}
        </Tabs.List>
        {canUsers && (
          <Tabs.Panel value="accounts">
            <AccountsTab roles={roles.data} />
          </Tabs.Panel>
        )}
        {canRoles && (
          <Tabs.Panel value="roles">
            <RolesTab roles={roles.data} isLoading={roles.isLoading} error={roles.error} />
          </Tabs.Panel>
        )}
      </Tabs>
    </Stack>
  );
}
