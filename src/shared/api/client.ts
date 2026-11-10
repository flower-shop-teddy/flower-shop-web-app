import { ApiError, ErrorCodes } from './ApiError';
import { session, type TokenResponse } from './session';
import type { ApiEnvelope, FieldViolation } from './types';

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  headers?: Record<string, string>;
  /** false = API public, không gắn token, không tự làm mới token. */
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  if (!query) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

function newCorrelationId(): string {
  return crypto.randomUUID();
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T> | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    return null; // ví dụ trang lỗi HTML của proxy
  }
}

async function send<T>(
  path: string,
  opts: RequestOptions,
  token: string | null,
): Promise<{ res: Response; env: ApiEnvelope<T> | null; correlationId: string }> {
  const correlationId = newCorrelationId();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Correlation-Id': correlationId,
    ...opts.headers,
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'same-origin',
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError({
      code: ErrorCodes.NETWORK,
      message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.',
      status: 0,
      correlationId,
    });
  }
  return { res, env: await parseEnvelope<T>(res), correlationId };
}

function toError<T>(res: Response, env: ApiEnvelope<T> | null, correlationId: string): ApiError {
  const code = env?.code ?? (res.status === 401 ? ErrorCodes.UNAUTHORIZED : `HTTP-${res.status}`);
  const violations =
    code === ErrorCodes.VALIDATION && Array.isArray(env?.data) ? (env.data as FieldViolation[]) : [];
  return new ApiError({
    code,
    status: res.status,
    message:
      env?.message ??
      (res.status >= 500 ? 'Hệ thống đang bận, vui lòng thử lại sau.' : 'Yêu cầu không thành công.'),
    correlationId: env?.correlationId ?? res.headers.get('X-Correlation-Id') ?? correlationId,
    violations,
  });
}

// ---- Làm mới token: single-flight -------------------------------------------------------------
// Nhiều request cùng gặp token hết hạn thì chỉ gọi /refresh MỘT lần. Gọi hai lần song song với cùng
// refresh token sẽ bị backend coi là dùng lại token (IDN-401-002) và thu hồi cả phiên.
let refreshing: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  const refreshToken = session.getRefreshToken();
  if (!refreshToken) return Promise.resolve(false);

  refreshing = (async () => {
    try {
      const { res, env, correlationId } = await send<TokenResponse>(
        '/api/v1/auth/refresh',
        { method: 'POST', body: { refreshToken } },
        null,
      );
      if (res.ok && env?.code === '00' && env.data) {
        session.store(env.data);
        return true;
      }
      const err = toError(res, env, correlationId);
      // Chỉ kết thúc phiên khi server khẳng định token hỏng; lỗi mạng/5xx thì để người dùng thử lại.
      if (res.status === 401 || err.is(ErrorCodes.INVALID_REFRESH)) session.end('expired');
      return false;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Gọi API qua gateway, trả `data` của envelope, ném ApiError khi lỗi. */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;

  if (auth && !session.isAccessFresh() && session.getRefreshToken()) {
    await refreshSession();
  }

  let { res, env, correlationId } = await send<T>(path, opts, auth ? session.getAccessToken() : null);

  // Token có thể vừa hết hạn giữa chừng (hoặc bị thu hồi): thử làm mới đúng một lần rồi gọi lại.
  if (auth && res.status === 401 && session.getRefreshToken()) {
    if (await refreshSession()) {
      ({ res, env, correlationId } = await send<T>(path, opts, session.getAccessToken()));
    }
  }

  if (!res.ok || (env && env.code !== '00')) {
    const err = toError(res, env, correlationId);
    if (auth && res.status === 401 && session.hasSession()) session.end('expired');
    throw err;
  }
  return env?.data as T;
}
