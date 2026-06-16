import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import {
  FieldValues,
  Path,
  SubmitHandler,
  UseFormSetError,
  useForm,
} from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { login, signup } from '../../lib/api/auth';
import { ApiError } from '../../lib/api/types';
import { setAccessToken } from '../../lib/auth/tokenStorage';

const loginSchema = z.object({
  email: z.string().email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.'),
});

const signupSchema = z.object({
  nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.'),
  email: z.string().email('이메일 형식을 확인해 주세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type LoginLocationState = {
  message?: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const state = location.state as LoginLocationState | null;
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      setAccessToken(response.accessToken);
      queryClient.setQueryData(['auth', 'me'], response.user);
      navigate('/app', { replace: true });
    },
    onError: (error) => applyServerErrors(error, setError),
  });
  const rootError = getRootError(loginMutation.error);

  const onSubmit: SubmitHandler<LoginFormValues> = (values) => {
    loginMutation.mutate(values);
  };

  return (
    <AuthLayout
      eyebrow="Text Memory MVP"
      title="기억을 다시 꺼내 쓰는 공간"
      summary="이메일과 비밀번호로 로그인하고, 나만의 기록 공간으로 돌아갑니다."
    >
      {state?.message ? <p className="alert alert-success">{state.message}</p> : null}
      {rootError ? <p className="alert alert-error">{rootError}</p> : null}
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          autoComplete="email"
          error={errors.email?.message}
          label="이메일"
          type="email"
          {...register('email')}
        />
        <TextField
          autoComplete="current-password"
          error={errors.password?.message}
          label="비밀번호"
          type="password"
          {...register('password')}
        />
        <button className="button" disabled={loginMutation.isPending} type="submit">
          <Icon icon="solar:login-2-linear" aria-hidden="true" />
          로그인
        </button>
      </form>
      <p className="auth-switch">
        계정이 없으신가요? <Link to="/signup">회원가입</Link>
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nickname: '',
      email: '',
      password: '',
    },
  });
  const signupMutation = useMutation({
    mutationFn: signup,
    onSuccess: () => {
      navigate('/login', {
        replace: true,
        state: { message: '가입이 완료되었습니다. 로그인해 주세요.' },
      });
    },
    onError: (error) => applyServerErrors(error, setError),
  });
  const rootError = getRootError(signupMutation.error);

  const onSubmit: SubmitHandler<SignupFormValues> = (values) => {
    signupMutation.mutate(values);
  };

  return (
    <AuthLayout
      eyebrow="Create Account"
      title="회원가입"
      summary="닉네임, 이메일, 비밀번호로 Memento 계정을 만듭니다."
    >
      {rootError ? <p className="alert alert-error">{rootError}</p> : null}
      <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          autoComplete="nickname"
          error={errors.nickname?.message}
          label="닉네임"
          type="text"
          {...register('nickname')}
        />
        <TextField
          autoComplete="email"
          error={errors.email?.message}
          label="이메일"
          type="email"
          {...register('email')}
        />
        <TextField
          autoComplete="new-password"
          error={errors.password?.message}
          label="비밀번호"
          type="password"
          {...register('password')}
        />
        <button className="button" disabled={signupMutation.isPending} type="submit">
          <Icon icon="solar:user-plus-rounded-linear" aria-hidden="true" />
          회원가입
        </button>
      </form>
      <p className="auth-switch">
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </AuthLayout>
  );
}

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
};

function AuthLayout({ eyebrow, title, summary, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="auth-summary">{summary}</p>
        {children}
      </section>
    </main>
  );
}

type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  label: string;
};

function TextField({ error, id, label, ...props }: TextFieldProps) {
  const inputId = id ?? `field-${label}`;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input aria-invalid={Boolean(error)} id={inputId} {...props} />
      <p className="field-error">{error ?? ''}</p>
    </div>
  );
}

function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!(error instanceof ApiError)) {
    return;
  }
  for (const fieldError of error.fieldErrors) {
    setError(fieldError.field as Path<T>, {
      message: fieldError.message,
      type: 'server',
    });
  }
}

function getRootError(error: unknown): string | null {
  if (error instanceof ApiError && error.fieldErrors.length === 0) {
    return error.detail;
  }
  if (error instanceof Error && !(error instanceof ApiError)) {
    return error.message;
  }
  return null;
}
