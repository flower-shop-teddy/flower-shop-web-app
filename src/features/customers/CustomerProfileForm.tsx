import { Button, Group, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState } from 'react';
import { z } from 'zod';
import { ErrorCodes, isApiError } from '@/shared/api/ApiError';
import { handleFormError, notifySuccess } from '@/shared/lib/errors';
import { dayjs } from '@/shared/lib/format';
import { optionalEmail } from '@/shared/lib/validation';
import type { Customer, UpdateCustomerRequest } from './api';

/** Form sửa hồ sơ khách (dùng cho cả khách tự sửa và nhân viên sửa). Luôn gửi version vừa đọc. */
export function CustomerProfileForm({
  customer,
  onSave,
  onReload,
  readOnly = false,
}: {
  customer: Customer;
  onSave: (body: UpdateCustomerRequest) => Promise<Customer>;
  onReload: () => void;
  readOnly?: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const form = useForm({
    initialValues: {
      fullName: customer.fullName,
      email: customer.email ?? '',
      dateOfBirth: customer.dateOfBirth ?? null,
    } as { fullName: string; email: string; dateOfBirth: string | null },
    validate: zod4Resolver(
      z.object({
        fullName: z.string().trim().min(1, 'Nhập họ tên').max(150),
        email: optionalEmail,
        dateOfBirth: z.string().nullable(),
      }),
    ),
  });

  const submit = form.onSubmit(async (v) => {
    setSaving(true);
    try {
      await onSave({
        fullName: v.fullName.trim(),
        email: v.email.trim() || undefined,
        dateOfBirth: v.dateOfBirth ?? undefined,
        version: customer.version,
      });
      form.resetDirty();
      notifySuccess('Đã lưu hồ sơ');
    } catch (e) {
      handleFormError(form, e, 'Chưa lưu được hồ sơ');
      if (isApiError(e) && e.is(ErrorCodes.OPTIMISTIC_LOCK)) onReload();
    } finally {
      setSaving(false);
    }
  });

  return (
    <form onSubmit={submit} noValidate>
      <Stack maw={640}>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Mã khách hàng" value={customer.customerCode} readOnly variant="filled" />
          <TextInput
            label="Số điện thoại"
            value={customer.phone}
            readOnly
            variant="filled"
            description="Không đổi được số điện thoại"
          />
        </SimpleGrid>
        <TextInput label="Họ và tên" required readOnly={readOnly} {...form.getInputProps('fullName')} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput label="Email" type="email" readOnly={readOnly} {...form.getInputProps('email')} />
          <DateInput
            label="Ngày sinh"
            valueFormat="DD/MM/YYYY"
            clearable
            readOnly={readOnly}
            maxDate={dayjs().subtract(1, 'day').toDate()}
            {...form.getInputProps('dateOfBirth')}
          />
        </SimpleGrid>
        {!readOnly && (
          <Group>
            <Button type="submit" loading={saving} disabled={!form.isDirty()}>
              Lưu thay đổi
            </Button>
          </Group>
        )}
      </Stack>
    </form>
  );
}
