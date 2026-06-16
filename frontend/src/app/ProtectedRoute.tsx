import { useQuery } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { me } from '../lib/api/auth';
import { ApiError } from '../lib/api/types';
import { getAccessToken } from '../lib/auth/tokenStorage';
import { AppShell } from './Shell';

export function ProtectedRoute() {
  const hasAccessToken = Boolean(getAccessToken());

  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
    enabled: hasAccessToken,
    retry: false,
  });

  if (!hasAccessToken) {
    return <Navigate to="/login" replace />;
  }

  if (userQuery.isLoading) {
    return <div className="loading">인증 상태를 확인하고 있습니다.</div>;
  }

  if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
    return <Navigate to="/login" replace />;
  }

  if (userQuery.isError) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-live="polite">
          <p className="eyebrow">Memento</p>
          <h1>잠시 후 다시 시도해 주세요</h1>
          <p className="auth-summary">내 정보를 불러오는 중 문제가 발생했습니다.</p>
        </section>
      </main>
    );
  }

  return (
    <AppShell user={userQuery.data}>
      <Outlet />
    </AppShell>
  );
}
