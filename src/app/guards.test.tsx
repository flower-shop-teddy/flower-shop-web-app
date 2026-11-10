import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Me } from '@/features/auth/api';
import { session } from '@/shared/api/session';
import { ok, server } from '@/test/server';
import { RequireAuth } from './guards';
import { AppProviders, createQueryClient } from './providers';

function renderAt(path: string, me: Partial<Me> | null) {
  if (me) {
    session.store({
      tokenType: 'Bearer',
      accessToken: 'A',
      expiresIn: 900,
      refreshToken: 'R',
      refreshExpiresIn: 1,
      passwordChangeRequired: false,
    });
    server.use(
      http.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          ok({
            publicId: 'u1',
            userType: 'STAFF',
            roles: [],
            permissions: [],
            passwordChangeRequired: false,
            ...me,
          }),
        ),
      ),
    );
  } else {
    session.end('logout');
  }
  const router = createMemoryRouter(
    [
      { path: '/login', element: <p>trang đăng nhập</p> },
      { path: '/change-password', element: <p>trang đổi mật khẩu</p> },
      {
        path: '/admin/flowers',
        element: (
          <RequireAuth userType="STAFF" anyOf={['flower:write']}>
            <p>quản lý hoa</p>
          </RequireAuth>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <AppProviders client={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('RequireAuth', () => {
  it('chưa đăng nhập -> về trang đăng nhập', async () => {
    renderAt('/admin/flowers', null);
    expect(await screen.findByText('trang đăng nhập')).toBeInTheDocument();
  });

  it('có permission -> vào được', async () => {
    renderAt('/admin/flowers', { permissions: ['flower:write'] });
    expect(await screen.findByText('quản lý hoa')).toBeInTheDocument();
  });

  it('thiếu permission -> báo không có quyền', async () => {
    renderAt('/admin/flowers', { permissions: ['order:read'] });
    expect(await screen.findByText(/chưa được cấp quyền/)).toBeInTheDocument();
  });

  it('khách hàng không vào được trang nhân viên', async () => {
    renderAt('/admin/flowers', { userType: 'CUSTOMER', permissions: ['flower:write'] });
    expect(await screen.findByText(/chưa được cấp quyền/)).toBeInTheDocument();
  });

  it('chưa đổi mật khẩu lần đầu -> bị buộc sang trang đổi mật khẩu', async () => {
    renderAt('/admin/flowers', { permissions: [], passwordChangeRequired: true });
    expect(await screen.findByText('trang đổi mật khẩu')).toBeInTheDocument();
  });
});
