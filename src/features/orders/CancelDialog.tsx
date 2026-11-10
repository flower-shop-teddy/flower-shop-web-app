import { Button, Group, Stack, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';

function CancelReasonForm({ onSubmit }: { onSubmit: (reason?: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Stack>
      <Textarea
        label="Lý do (không bắt buộc)"
        maxLength={200}
        autosize
        minRows={2}
        data-autofocus
        value={reason}
        onChange={(e) => setReason(e.currentTarget.value)}
      />
      <Group justify="flex-end">
        <Button variant="default" onClick={() => modals.closeAll()}>
          Quay lại
        </Button>
        <Button
          color="red"
          onClick={() => {
            modals.closeAll();
            onSubmit(reason.trim() || undefined);
          }}
        >
          Hủy đơn
        </Button>
      </Group>
    </Stack>
  );
}

/** Hỏi lý do rồi mới hủy. Hoa đang giữ cho đơn sẽ được trả về kho. */
export function openCancelDialog(orderCode: string, onSubmit: (reason?: string) => void) {
  modals.open({ title: `Hủy đơn ${orderCode}?`, children: <CancelReasonForm onSubmit={onSubmit} /> });
}
