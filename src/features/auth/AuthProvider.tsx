import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { notifications } from '@mantine/notifications';
import { session, type SessionEndReason } from '@/shared/api/session';
import { authApi, type Me } from './api';

interface AuthContextValue {
  me: Me | null;
  /** Đang khôi phục phiên sau khi F5 (có refresh token, chưa biết là ai). */
  loading: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  /** Gọi sau khi login thành công để nạp lại thông tin người dùng. */
  reload: () => Promise<Me | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export const ME_KEY = ['auth', 'me'] as const;

const endMessages: Partial<Record<SessionEndReason, string>> = {
  expired: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  idle: 'Bạn đã được đăng xuất vì không thao tác trong 15 phút.',
  'password-changed': 'Đã đổi mật khẩu. Hãy đăng nhập lại bằng mật khẩu mới.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (session.hasSession() ? authApi.me() : null),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Phiên kết thúc (hết hạn, idle, logout ở chỗ khác): xóa toàn bộ dữ liệu đã cache của người cũ.
  useEffect(
    () =>
      session.onEnd((reason) => {
        qc.setQueryData(ME_KEY, null);
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
        const msg = endMessages[reason];
        if (msg)
          notifications.show({
            color: reason === 'password-changed' ? 'teal' : 'yellow',
            message: msg,
            autoClose: 6000,
          });
      }),
    [qc],
  );

  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ME_KEY });
    return qc.getQueryData<Me | null>(ME_KEY) ?? null;
  }, [qc]);

  const logout = useCallback(async () => {
    const rt = session.getRefreshToken();
    // Thu hồi refresh token ở server; lỗi mạng cũng vẫn xóa phiên phía trình duyệt.
    if (rt) await authApi.logout(rt).catch(() => undefined);
    session.end('logout');
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const me = meQuery.data ?? null;
    const perms = new Set(me?.permissions ?? []);
    return {
      me,
      loading: meQuery.isPending,
      isStaff: me?.userType === 'STAFF',
      isCustomer: me?.userType === 'CUSTOMER',
      can: (p) => perms.has(p),
      canAny: (...ps) => ps.some((p) => perms.has(p)),
      reload,
      logout,
    };
  }, [meQuery.data, meQuery.isPending, reload, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
