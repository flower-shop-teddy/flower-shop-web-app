import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Link, Outlet, ScrollRestoration, useRouteError } from 'react-router';
import { AccountPage, MyOrderDetailPage } from '@/features/account/AccountPage';
import { ChangePasswordPage, LoginPage, RegisterPage } from '@/features/auth/pages';
import { FlowerDetailPage } from '@/features/catalog/FlowerDetailPage';
import { ShopPage } from '@/features/catalog/ShopPage';
import { CheckoutPage } from '@/features/checkout/CheckoutPage';
import { RequireAuth } from './guards';
import { AdminLayout } from './layouts/AdminLayout';
import { ShopLayout } from './layouts/ShopLayout';

/** Trang quản trị tách bundle riêng: khách xem cửa hàng không phải tải code admin. */
function lazyPage<T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) {
  const C = lazy(async () => ({ default: (await load())[name] as ComponentType }));
  return (
    <Suspense
      fallback={
        <Center py="xl">
          <Loader color="pink" type="dots" />
        </Center>
      }
    >
      <C />
    </Suspense>
  );
}

const admin = {
  dashboard: () => lazyPage(() => import('@/features/admin/DashboardPage'), 'DashboardPage'),
  orders: () => lazyPage(() => import('@/features/orders/AdminOrdersPage'), 'AdminOrdersPage'),
  flowers: () => lazyPage(() => import('@/features/catalog/AdminFlowersPage'), 'AdminFlowersPage'),
  inventory: () => lazyPage(() => import('@/features/inventory/InventoryPage'), 'InventoryPage'),
  customers: () => lazyPage(() => import('@/features/customers/AdminCustomersPage'), 'AdminCustomersPage'),
  customer: () =>
    lazyPage(() => import('@/features/customers/AdminCustomersPage'), 'AdminCustomerDetailPage'),
  users: () => lazyPage(() => import('@/features/users/UsersPage'), 'UsersPage'),
};

function guard(node: ReactNode, anyOf?: string[]) {
  return (
    <RequireAuth userType="STAFF" anyOf={anyOf}>
      {node}
    </RequireAuth>
  );
}

function Root() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  );
}

function NotFound() {
  return (
    <Center py={80}>
      <Stack align="center" gap="xs">
        <Text fz={56}>🥀</Text>
        <Title order={3}>Không tìm thấy trang</Title>
        <Button component={Link} to="/" variant="light" mt="sm">
          Về cửa hàng
        </Button>
      </Stack>
    </Center>
  );
}

function RouteError() {
  const err = useRouteError();
  console.error(err);
  return (
    <Center py={80}>
      <Stack align="center" gap="xs">
        <Title order={3}>Đã có lỗi khi hiển thị trang</Title>
        <Text c="dimmed" size="sm">
          Vui lòng tải lại trang. Nếu lỗi lặp lại, hãy báo cho cửa hàng.
        </Text>
        <Button onClick={() => window.location.reload()} mt="sm">
          Tải lại
        </Button>
      </Stack>
    </Center>
  );
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <ShopLayout />,
        children: [
          { index: true, element: <ShopPage /> },
          { path: 'flowers/:id', element: <FlowerDetailPage /> },
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'change-password', element: <ChangePasswordPage /> },
          {
            path: 'checkout',
            element: (
              <RequireAuth userType="CUSTOMER">
                <CheckoutPage />
              </RequireAuth>
            ),
          },
          {
            path: 'account',
            element: (
              <RequireAuth userType="CUSTOMER">
                <Outlet />
              </RequireAuth>
            ),
            children: [
              { index: true, element: <AccountPage tab="profile" /> },
              { path: 'addresses', element: <AccountPage tab="addresses" /> },
              { path: 'orders', element: <AccountPage tab="orders" /> },
              { path: 'orders/:code', element: <MyOrderDetailPage /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
      {
        path: 'admin',
        element: guard(<AdminLayout />),
        children: [
          { index: true, element: admin.dashboard() },
          { path: 'orders', element: guard(admin.orders(), ['order:read']) },
          { path: 'flowers', element: guard(admin.flowers(), ['flower:write']) },
          { path: 'inventory', element: guard(admin.inventory(), ['inventory:read']) },
          { path: 'customers', element: guard(admin.customers(), ['customer:read']) },
          { path: 'customers/:id', element: guard(admin.customer(), ['customer:read']) },
          { path: 'users', element: guard(admin.users(), ['user:read', 'role:read']) },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
