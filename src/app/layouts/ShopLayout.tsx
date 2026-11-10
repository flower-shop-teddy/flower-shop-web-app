import {
  ActionIcon,
  Anchor,
  AppShell,
  Avatar,
  Box,
  Button,
  Container,
  Group,
  Indicator,
  Menu,
  Text,
  UnstyledButton,
} from '@mantine/core';
import {
  IconChevronDown,
  IconLayoutDashboard,
  IconLogout,
  IconPackage,
  IconShoppingBag,
  IconUser,
} from '@tabler/icons-react';
import { Link, Outlet, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';
import { CartDrawer } from '@/features/cart/CartDrawer';
import { useCart } from '@/features/cart/CartProvider';

export function Logo() {
  return (
    <Anchor component={Link} to="/" underline="never" c="inherit">
      <Group gap={8} wrap="nowrap">
        <Text fz={26} lh={1} aria-hidden>
          🌸
        </Text>
        <Text fw={800} fz="lg" c="pink.7" style={{ letterSpacing: -0.3 }}>
          Flower Shop
        </Text>
      </Group>
    </Anchor>
  );
}

function UserMenu() {
  const { me, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  if (!me) {
    return (
      <Group gap="xs">
        <Button component={Link} to="/login" variant="subtle" size="sm">
          Đăng nhập
        </Button>
        <Button component={Link} to="/register" size="sm" visibleFrom="xs">
          Đăng ký
        </Button>
      </Group>
    );
  }
  const name = me.username ?? me.phone ?? 'Tài khoản';
  return (
    <Menu position="bottom-end" width={220} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Tài khoản">
          <Group gap={6} wrap="nowrap">
            <Avatar size={32} color="pink" radius="xl">
              {me.username ? me.username.slice(0, 1).toUpperCase() : <IconUser size={18} />}
            </Avatar>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{name}</Menu.Label>
        {isStaff ? (
          <Menu.Item leftSection={<IconLayoutDashboard size={16} />} component={Link} to="/admin">
            Trang quản trị
          </Menu.Item>
        ) : (
          <>
            <Menu.Item leftSection={<IconUser size={16} />} component={Link} to="/account">
              Hồ sơ & địa chỉ
            </Menu.Item>
            <Menu.Item leftSection={<IconPackage size={16} />} component={Link} to="/account/orders">
              Đơn hàng của tôi
            </Menu.Item>
          </>
        )}
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconLogout size={16} />}
          onClick={async () => {
            await logout();
            navigate('/');
          }}
        >
          Đăng xuất
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export function ShopLayout() {
  const cart = useCart();
  return (
    <AppShell header={{ height: 64 }} padding={0}>
      <AppShell.Header style={{ backdropFilter: 'blur(8px)', background: 'rgba(255,255,255,0.88)' }}>
        <Container size="lg" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Logo />
            <Group gap="sm" wrap="nowrap">
              <Indicator label={cart.count} size={18} disabled={cart.count === 0} color="pink" offset={4}>
                <ActionIcon variant="light" size="lg" radius="xl" onClick={cart.open} aria-label="Giỏ hàng">
                  <IconShoppingBag size={20} />
                </ActionIcon>
              </Indicator>
              <UserMenu />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>
      <AppShell.Main style={{ background: 'linear-gradient(180deg, #fff5f8 0px, #ffffff 360px)' }}>
        <Container size="lg" py="lg">
          <Outlet />
        </Container>
        <Box
          component="footer"
          py="lg"
          mt="xl"
          style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
        >
          <Container size="lg">
            <Text size="xs" c="dimmed" ta="center">
              © Flower Shop · Giao hoa trong ngày · Hỗ trợ 8:00–21:00
            </Text>
          </Container>
        </Box>
      </AppShell.Main>
      <CartDrawer />
    </AppShell>
  );
}
