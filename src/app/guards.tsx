import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useAuth } from '@/features/auth/AuthProvider';

function FullLoader() {
  return (
    <Center py={80}>
      <Loader color="pink" type="dots" />
    </Center>
  );
}

export function Forbidden() {
  return (
    <Center py={80}>
      <Stack align="center" gap="xs">
        <IconLock size={44} stroke={1.3} color="var(--mantine-color-pink-5)" />
        <Title order={3}>Bạn chưa được cấp quyền vào trang này</Title>
        <Text c="dimmed" size="sm">
          Liên hệ quản trị viên nếu bạn cần quyền truy cập.
        </Text>
        <Button component={Link} to="/" variant="light" mt="sm">
          Về trang chủ
        </Button>
      </Stack>
    </Center>
  );
}

/**
 * Chặn route ở phía giao diện cho gọn trải nghiệm. Đây KHÔNG phải lớp bảo mật:
 * gateway và từng service vẫn tự kiểm tra JWT + permission cho mọi API.
 */
export function RequireAuth({
  userType,
  anyOf,
  children,
}: {
  userType?: 'STAFF' | 'CUSTOMER';
  /** Cần ít nhất một trong các permission này. */
  anyOf?: string[];
  children: ReactNode;
}) {
  const { me, loading, canAny } = useAuth();
  const location = useLocation();
  if (loading) return <FullLoader />;
  if (!me)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (me.passwordChangeRequired) return <Navigate to="/change-password" replace />;
  if (userType && me.userType !== userType) return <Forbidden />;
  if (anyOf && anyOf.length > 0 && !canAny(...anyOf)) return <Forbidden />;
  return <>{children}</>;
}
