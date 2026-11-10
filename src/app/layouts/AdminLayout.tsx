import { AppShell, Badge, Burger, Button, Group, NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBuildingStore,
  IconClipboardList,
  IconFlower,
  IconHome,
  IconKey,
  IconLogout,
  IconPackages,
  IconUsers,
  IconUserShield,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { Logo } from './ShopLayout';

/** Menu hiện theo permission trong token, không theo tên role (role đổi quyền thì menu tự theo). */
export const adminNav = [
  { to: '/admin', label: 'Tổng quan', icon: IconHome, anyOf: [] as string[], exact: true },
  { to: '/admin/orders', label: 'Đơn hàng', icon: IconClipboardList, anyOf: ['order:read'] },
  { to: '/admin/flowers', label: 'Danh mục hoa', icon: IconFlower, anyOf: ['flower:write'] },
  { to: '/admin/inventory', label: 'Tồn kho', icon: IconPackages, anyOf: ['inventory:read'] },
  { to: '/admin/customers', label: 'Khách hàng', icon: IconUsers, anyOf: ['customer:read'] },
  { to: '/admin/users', label: 'Nhân viên & quyền', icon: IconUserShield, anyOf: ['user:read', 'role:read'] },
];

export function AdminLayout() {
  const [opened, { toggle, close }] = useDisclosure();
  const { me, canAny, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Mở menu" />
            <Logo />
            <Badge variant="light" color="mint" visibleFrom="xs">
              Quản trị
            </Badge>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="sm">
              {me?.username}
            </Text>
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconLogout size={16} />}
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Đăng xuất
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <AppShell.Section grow component={ScrollArea}>
          <Stack gap={2}>
            {adminNav
              .filter((n) => n.anyOf.length === 0 || canAny(...n.anyOf))
              .map((n) => {
                const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                return (
                  <NavLink
                    key={n.to}
                    component={Link}
                    to={n.to}
                    label={n.label}
                    leftSection={<n.icon size={18} stroke={1.6} />}
                    active={active}
                    variant="light"
                    style={{ borderRadius: 'var(--mantine-radius-md)' }}
                    onClick={close}
                  />
                );
              })}
          </Stack>
        </AppShell.Section>
        <AppShell.Section>
          <Stack gap={2} pt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
            <NavLink
              component={Link}
              to="/change-password"
              label="Đổi mật khẩu"
              leftSection={<IconKey size={18} stroke={1.6} />}
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
            />
            <NavLink
              component={Link}
              to="/"
              label="Xem cửa hàng"
              leftSection={<IconBuildingStore size={18} stroke={1.6} />}
              style={{ borderRadius: 'var(--mantine-radius-md)' }}
            />
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main bg="#fcfcfd">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
