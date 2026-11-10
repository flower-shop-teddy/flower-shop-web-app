import {
  Anchor,
  Button,
  Center,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { IconShieldLock } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { session } from '@/shared/api/session';
import { handleFormError, notifySuccess } from '@/shared/lib/errors';
import { dayjs } from '@/shared/lib/format';
import { emptyToUndefined, optionalEmail, passwordSchema, phoneSchema } from '@/shared/lib/validation';
import { authApi } from './api';
import { useAuth } from './AuthProvider';

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Center py={48} px="md">
      <Paper withBorder shadow="sm" p="xl" w="100%" maw={420}>
        <Stack gap={4} mb="lg">
          <Title order={2}>{title}</Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </Stack>
        {children}
      </Paper>
    </Center>
  );
}

/** Chỉ cho chuyển hướng nội bộ (chống open redirect qua ?next=https://...). */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function LoginPage() {
  const { me, reload } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const form = useForm({
    initialValues: { loginId: '', password: '' },
    validate: zod4Resolver(
      z.object({
        loginId: z.string().trim().min(1, 'Nhập tên đăng nhập hoặc số điện thoại').max(50),
        password: z.string().min(1, 'Nhập mật khẩu').max(128),
      }),
    ),
  });
  const [submitting, setSubmitting] = useState(false);

  if (me && !me.passwordChangeRequired)
    return <Navigate to={next ?? (me.userType === 'STAFF' ? '/admin' : '/')} replace />;

  const submit = form.onSubmit(async (v) => {
    setSubmitting(true);
    try {
      const tokens = await authApi.login(v.loginId.trim(), v.password);
      session.store(tokens);
      const user = await reload();
      if (tokens.passwordChangeRequired || user?.passwordChangeRequired) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(next ?? (user?.userType === 'STAFF' ? '/admin' : '/'), { replace: true });
      }
    } catch (e) {
      form.setFieldValue('password', '');
      handleFormError(form, e, 'Đăng nhập không thành công');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard title="Đăng nhập" subtitle="Khách hàng dùng số điện thoại, nhân viên dùng tên đăng nhập.">
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput
            label="Số điện thoại / Tên đăng nhập"
            autoComplete="username"
            autoFocus
            {...form.getInputProps('loginId')}
          />
          <PasswordInput
            label="Mật khẩu"
            autoComplete="current-password"
            {...form.getInputProps('password')}
          />
          <Button type="submit" loading={submitting} fullWidth size="md">
            Đăng nhập
          </Button>
          <Text size="sm" ta="center">
            Chưa có tài khoản?{' '}
            <Anchor component={Link} to="/register">
              Đăng ký
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthCard>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const form = useForm({
    initialValues: {
      fullName: '',
      phone: '',
      email: '',
      dateOfBirth: null as string | null,
      password: '',
      confirm: '',
    },
    validate: (values) =>
      zod4Resolver(
        z
          .object({
            fullName: z.string().trim().min(1, 'Nhập họ tên').max(150),
            phone: phoneSchema,
            email: optionalEmail,
            dateOfBirth: z.string().nullable(),
            password: passwordSchema(() => values.phone),
            confirm: z.string(),
          })
          .refine((v) => v.password === v.confirm, {
            path: ['confirm'],
            message: 'Mật khẩu nhập lại không khớp',
          }),
      )(values),
  });

  const submit = form.onSubmit(async (v) => {
    setSubmitting(true);
    try {
      await authApi.register(
        emptyToUndefined({
          fullName: v.fullName.trim(),
          phone: v.phone.trim(),
          email: v.email.trim(),
          dateOfBirth: v.dateOfBirth ?? undefined,
          password: v.password,
        }),
      );
      notifySuccess('Tạo tài khoản thành công. Mời bạn đăng nhập.');
      navigate('/login', { replace: true });
    } catch (e) {
      handleFormError(form, e, 'Đăng ký không thành công');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard title="Tạo tài khoản" subtitle="Để đặt hoa và theo dõi đơn hàng của bạn.">
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput label="Họ và tên" required autoComplete="name" {...form.getInputProps('fullName')} />
          <TextInput
            label="Số điện thoại"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901234567"
            {...form.getInputProps('phone')}
          />
          <TextInput label="Email" type="email" autoComplete="email" {...form.getInputProps('email')} />
          <DateInput
            label="Ngày sinh"
            valueFormat="DD/MM/YYYY"
            maxDate={dayjs().subtract(1, 'day').toDate()}
            clearable
            {...form.getInputProps('dateOfBirth')}
          />
          <PasswordInput
            label="Mật khẩu"
            required
            description="Ít nhất 8 ký tự, có cả chữ và số"
            autoComplete="new-password"
            {...form.getInputProps('password')}
          />
          <PasswordInput
            label="Nhập lại mật khẩu"
            required
            autoComplete="new-password"
            {...form.getInputProps('confirm')}
          />
          <Button type="submit" loading={submitting} fullWidth size="md">
            Đăng ký
          </Button>
          <Text size="sm" ta="center">
            Đã có tài khoản?{' '}
            <Anchor component={Link} to="/login">
              Đăng nhập
            </Anchor>
          </Text>
        </Stack>
      </form>
    </AuthCard>
  );
}

export function ChangePasswordPage() {
  const { me, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const loginId = me?.username ?? me?.phone ?? '';
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirm: '' },
    validate: (values) =>
      zod4Resolver(
        z
          .object({
            currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
            newPassword: passwordSchema(() => loginId),
            confirm: z.string(),
          })
          .refine((v) => v.newPassword === v.confirm, {
            path: ['confirm'],
            message: 'Mật khẩu nhập lại không khớp',
          })
          .refine((v) => v.newPassword !== v.currentPassword, {
            path: ['newPassword'],
            message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
          }),
      )(values),
  });

  if (!loading && !me) return <Navigate to="/login" replace />;

  const submit = form.onSubmit(async (v) => {
    setSubmitting(true);
    try {
      await authApi.changePassword(v.currentPassword, v.newPassword);
      // Backend thu hồi mọi refresh token sau khi đổi mật khẩu -> phải đăng nhập lại.
      session.end('password-changed');
      navigate('/login', { replace: true });
    } catch (e) {
      handleFormError(form, e, 'Chưa đổi được mật khẩu');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard title="Đổi mật khẩu" subtitle={loginId ? `Tài khoản ${loginId}` : undefined}>
      {me?.passwordChangeRequired && (
        <Alert color="yellow" icon={<IconShieldLock size={18} />} mb="md" variant="light">
          Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được đặt lại. Bạn cần đổi mật khẩu trước khi sử
          dụng.
        </Alert>
      )}
      <form onSubmit={submit} noValidate>
        <Stack>
          <PasswordInput
            label="Mật khẩu hiện tại"
            autoComplete="current-password"
            {...form.getInputProps('currentPassword')}
          />
          <PasswordInput
            label="Mật khẩu mới"
            description="Ít nhất 8 ký tự, có chữ và số, không chứa tên đăng nhập"
            autoComplete="new-password"
            {...form.getInputProps('newPassword')}
          />
          <PasswordInput
            label="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            {...form.getInputProps('confirm')}
          />
          <Button type="submit" loading={submitting} fullWidth size="md">
            Đổi mật khẩu
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
