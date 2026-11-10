import { Button, Group, Modal, Progress, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { session } from '@/shared/api/session';
import { authApi } from './api';
import { useAuth } from './AuthProvider';

export const IDLE_LIMIT_MS = 15 * 60_000;
const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel', 'scroll'] as const;

/**
 * Tự đăng xuất khi không thao tác 15 phút (giống ứng dụng ngân hàng).
 * Báo trước 60 giây; bấm "Tiếp tục" hoặc thao tác bất kỳ là giữ phiên.
 * Tính theo đồng hồ thật (Date.now) nên tab chạy nền bị trình duyệt làm chậm timer vẫn đúng giờ.
 */
export function IdleWatcher() {
  const { me } = useAuth();
  const active = Boolean(me);
  const lastActivity = useRef(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    lastActivity.current = Date.now();
    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const left = Math.ceil((IDLE_LIMIT_MS - (Date.now() - lastActivity.current)) / 1000);
      if (left <= 0) {
        window.clearInterval(timer);
        setSecondsLeft(null);
        const rt = session.getRefreshToken();
        if (rt) void authApi.logout(rt).catch(() => undefined);
        session.end('idle');
      } else {
        setSecondsLeft(left <= WARNING_SECONDS ? left : null);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, [active]);

  const opened = active && secondsLeft !== null;
  return (
    <Modal opened={opened} onClose={() => undefined} withCloseButton={false} title="Bạn vẫn đang dùng chứ?">
      <Text size="sm">
        Vì an toàn, phiên sẽ tự đăng xuất sau <b>{secondsLeft ?? 0} giây</b> nếu không có thao tác.
      </Text>
      <Progress value={((secondsLeft ?? 0) / WARNING_SECONDS) * 100} mt="md" color="pink" />
      <Group justify="flex-end" mt="lg">
        <Button
          onClick={() => {
            lastActivity.current = Date.now();
            setSecondsLeft(null);
          }}
        >
          Tiếp tục làm việc
        </Button>
      </Group>
    </Modal>
  );
}
