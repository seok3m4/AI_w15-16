import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@iconify/react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../lib/api/auth';
import { UserPrivateResponse } from '../lib/api/types';
import { clearAccessToken } from '../lib/auth/tokenStorage';

type AppShellProps = {
  user: UserPrivateResponse | undefined;
};

const upcomingItems = [
  ['solar:magic-stars-linear', 'Memory Search'],
  ['solar:box-minimalistic-linear', 'Capsule'],
  ['solar:users-group-rounded-linear', '친구'],
  ['solar:robot-linear', 'Agent'],
  ['solar:plug-circle-linear', 'MCP'],
] as const;

export function AppShell({ user }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="앱 내비게이션">
        <div className="brand">Memento</div>
        <NavLink to="/app" className="nav-item active">
          <Icon icon="solar:home-2-linear" aria-hidden="true" />
          홈
        </NavLink>
        {upcomingItems.map(([icon, label]) => (
          <span className="nav-item disabled" key={label} aria-disabled="true">
            <Icon icon={icon} aria-hidden="true" />
            {label}
            <span className="badge">준비중</span>
          </span>
        ))}
      </aside>
      <main className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Text Memory MVP</p>
            <h1>내 기억</h1>
          </div>
          <div className="user-pill">
            <span className="avatar" aria-hidden="true">
              {(user?.nickname ?? 'M').slice(0, 1)}
            </span>
            <span>{user?.nickname ?? '사용자'}</span>
          </div>
        </header>
        <section className="placeholder-panel" aria-label="P0 인증 완료">
          <p>
            인증 흐름이 연결되었습니다. 게시글 피드와 작성 화면은 P0-FE-2에서 이
            공통 클라이언트와 보호 라우트를 이어받아 구현합니다.
          </p>
          <button
            className="button button-secondary"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
            type="button"
          >
            <Icon icon="solar:logout-2-linear" aria-hidden="true" />
            로그아웃
          </button>
        </section>
      </main>
    </div>
  );
}
