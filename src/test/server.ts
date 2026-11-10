import { setupServer } from 'msw/node';

/** MSW chặn fetch trong test: mỗi test tự khai báo handler bằng server.use(...). */
export const server = setupServer();

export const ok = <T>(data: T) => ({ code: '00', message: 'OK', data, correlationId: 'test-cid' });
export const fail = (code: string, message: string, data?: unknown) => ({
  code,
  message,
  data,
  correlationId: 'test-cid',
});
