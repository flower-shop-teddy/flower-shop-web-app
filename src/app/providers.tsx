import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { IdleWatcher } from '@/features/auth/IdleWatcher';
import { CartProvider } from '@/features/cart/CartProvider';
import { isApiError } from '@/shared/api/ApiError';
import { theme } from './theme';

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        refetchOnWindowFocus: true,
        // Không thử lại lỗi nghiệp vụ / quyền (4xx): kết quả sẽ y hệt. Chỉ thử lại lỗi mạng / 5xx.
        retry: (count, e) => count < 2 && !(isApiError(e) && e.status >= 400 && e.status < 500),
      },
      // Không bao giờ tự gửi lại thao tác ghi: có thể tạo dữ liệu trùng.
      mutations: { retry: false },
    },
  });
}

export function AppProviders({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ locale: 'vi', firstDayOfWeek: 1 }}>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <CartProvider>
              <ModalsProvider labels={{ confirm: 'Đồng ý', cancel: 'Hủy' }}>
                <Notifications position="top-center" limit={3} />
                <IdleWatcher />
                {children}
              </ModalsProvider>
            </CartProvider>
          </AuthProvider>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
