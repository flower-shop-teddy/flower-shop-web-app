import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { fail, ok, server } from '@/test/server';
import { ApiError } from './ApiError';
import { api } from './client';
import { session, type TokenResponse } from './session';

const tokens = (access: string, refresh: string, expiresIn = 900): TokenResponse => ({
  tokenType: 'Bearer',
  accessToken: access,
  expiresIn,
  refreshToken: refresh,
  refreshExpiresIn: 604800,
  passwordChangeRequired: false,
});

async function errorOf(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error('Mong đợi ApiError nhưng request thành công');
}

describe('api client', () => {
  it('trả về data của envelope và gắn Bearer + X-Correlation-Id', async () => {
    session.store(tokens('A1', 'R1'));
    let seen: Headers | undefined;
    server.use(
      http.get('/api/v1/things', ({ request }) => {
        seen = request.headers;
        return HttpResponse.json(ok({ id: 1 }));
      }),
    );
    await expect(api('/api/v1/things')).resolves.toEqual({ id: 1 });
    expect(seen?.get('authorization')).toBe('Bearer A1');
    expect(seen?.get('x-correlation-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('API public không gửi token', async () => {
    session.store(tokens('A1', 'R1'));
    let auth: string | null = 'x';
    server.use(
      http.get('/api/v1/flowers', ({ request }) => {
        auth = request.headers.get('authorization');
        return HttpResponse.json(ok([]));
      }),
    );
    await api('/api/v1/flowers', { auth: false });
    expect(auth).toBeNull();
  });

  it('bỏ query rỗng/undefined khỏi URL', async () => {
    let url = '';
    server.use(
      http.get('/api/v1/orders', ({ request }) => {
        url = request.url;
        return HttpResponse.json(ok(null));
      }),
    );
    await api('/api/v1/orders', { auth: false, query: { status: undefined, page: 0, phone: '' } });
    expect(new URL(url).search).toBe('?page=0');
  });

  it('lỗi validate -> ApiError có danh sách ô sai và correlationId', async () => {
    server.use(
      http.post('/api/v1/flowers', () =>
        HttpResponse.json(
          fail('COM-400-001', 'Dữ liệu không hợp lệ', [{ field: 'sku', message: 'sai định dạng' }]),
          { status: 400 },
        ),
      ),
    );
    const err = await errorOf(api('/api/v1/flowers', { method: 'POST', body: {}, auth: false }));
    expect(err.code).toBe('COM-400-001');
    expect(err.violations).toEqual([{ field: 'sku', message: 'sai định dạng' }]);
    expect(err.correlationId).toBe('test-cid');
  });

  it('nhiều request cùng gặp 401 chỉ gọi /refresh MỘT lần rồi gọi lại với token mới', async () => {
    session.store(tokens('OLD', 'R1'));
    const refreshCalls = vi.fn();
    server.use(
      http.post('/api/v1/auth/refresh', async ({ request }) => {
        refreshCalls(await request.json());
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json(ok(tokens('NEW', 'R2')));
      }),
      http.get('/api/v1/me-stuff', ({ request }) =>
        request.headers.get('authorization') === 'Bearer NEW'
          ? HttpResponse.json(ok('fresh'))
          : HttpResponse.json(fail('COM-401-001', 'Unauthorized'), { status: 401 }),
      ),
    );
    const results = await Promise.all([
      api('/api/v1/me-stuff'),
      api('/api/v1/me-stuff'),
      api('/api/v1/me-stuff'),
    ]);
    expect(results).toEqual(['fresh', 'fresh', 'fresh']);
    expect(refreshCalls).toHaveBeenCalledTimes(1);
    expect(refreshCalls).toHaveBeenCalledWith({ refreshToken: 'R1' });
    expect(session.getRefreshToken()).toBe('R2');
  });

  it('refresh token bị từ chối -> kết thúc phiên và báo cho UI', async () => {
    session.store(tokens('OLD', 'R1', 0)); // access đã hết hạn
    const ended = vi.fn();
    const off = session.onEnd(ended);
    server.use(
      http.post('/api/v1/auth/refresh', () =>
        HttpResponse.json(fail('IDN-401-002', 'Refresh token không hợp lệ'), { status: 401 }),
      ),
      http.get('/api/v1/me-stuff', () =>
        HttpResponse.json(fail('COM-401-001', 'Unauthorized'), { status: 401 }),
      ),
    );
    await expect(api('/api/v1/me-stuff')).rejects.toBeInstanceOf(ApiError);
    expect(ended).toHaveBeenCalledWith('expired');
    expect(session.hasSession()).toBe(false);
    off();
  });

  it('mất mạng -> ApiError NET-000, không kết thúc phiên', async () => {
    session.store(tokens('A1', 'R1'));
    server.use(http.get('/api/v1/x', () => HttpResponse.error()));
    const err = await errorOf(api('/api/v1/x'));
    expect(err.code).toBe('NET-000');
    expect(session.hasSession()).toBe(true);
    session.end('logout');
  });
});
