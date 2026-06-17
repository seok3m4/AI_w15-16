import { Icon } from '@iconify/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../lib/api/auth';
import { UserPrivateResponse } from '../lib/api/types';
import { clearAccessToken } from '../lib/auth/tokenStorage';

type AppShellProps = {
  children: React.ReactNode;
  user: UserPrivateResponse | undefined;
};

const activeItems = [
  ['solar:users-group-rounded-linear', '친구', '/app/friends'],
  ['solar:magic-stars-linear', 'Memory Search', '/app/memory-search'],
  ['solar:box-minimalistic-linear', 'Capsule', '/app/capsules'],
  ['solar:robot-linear', 'Agent', '/app/agent'],
  ['solar:settings-linear', '설정', '/app/settings'],
] as const;

const upcomingItems = [
  ['solar:plug-circle-linear', 'MCP'],
] as const;

export function AppShell({ children, user }: AppShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <div className={`app-shell${isCollapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar desktop-sidebar" aria-label="앱 내비게이션">
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed((current) => !current)}
        />
        <NavigationItems />
      </aside>

      <div
        aria-hidden={!isMobileMenuOpen}
        className={`mobile-drawer-backdrop${isMobileMenuOpen ? ' open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <aside
        aria-label="모바일 앱 내비게이션"
        className={`mobile-drawer${isMobileMenuOpen ? ' open' : ''}`}
      >
        <div className="mobile-drawer-header">
          <div className="brand">Memento</div>
          <button
            aria-label="메뉴 닫기"
            className="icon-button"
            onClick={() => setIsMobileMenuOpen(false)}
            type="button"
          >
            <Icon icon="solar:close-circle-linear" aria-hidden="true" />
          </button>
        </div>
        <NavigationItems />
      </aside>

      <main className="app-main">
        <header className="mobile-header">
          <button
            aria-label="메뉴 열기"
            className="icon-button"
            onClick={() => setIsMobileMenuOpen(true)}
            type="button"
          >
            <Icon icon="solar:hamburger-menu-linear" aria-hidden="true" />
          </button>
          <div className="mobile-wordmark">Memento</div>
          <Link className="icon-button" to="/app/posts/new" aria-label="기록 작성">
            <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
          </Link>
        </header>

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
            <button
              aria-label="로그아웃"
              className="user-pill-action"
              disabled={logoutMutation.isPending}
              onClick={() => logoutMutation.mutate()}
              type="button"
            >
              <Icon icon="solar:logout-2-linear" aria-hidden="true" />
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

type SidebarHeaderProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div className="sidebar-header">
      <div className="brand wordmark-full">Memento</div>
      <div className="brand wordmark-mini">M</div>
      <button
        aria-expanded={!isCollapsed}
        aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        className="icon-button sidebar-toggle"
        onClick={onToggle}
        type="button"
      >
        <Icon icon="solar:sidebar-minimalistic-linear" aria-hidden="true" />
      </button>
    </div>
  );
}

function NavigationItems() {
  return (
    <nav className="nav-list">
      <NavLink
        to="/app"
        end
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <Icon icon="solar:home-2-linear" aria-hidden="true" />
        <span className="nav-label">홈</span>
      </NavLink>
      {activeItems.map(([icon, label, to]) => (
        <NavLink
          to={to}
          key={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon icon={icon} aria-hidden="true" />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
      {upcomingItems.map(([icon, label]) => (
        <span className="nav-item disabled" key={label} aria-disabled="true">
          <Icon icon={icon} aria-hidden="true" />
          <span className="nav-label">{label}</span>
          <span className="badge">준비중</span>
        </span>
      ))}
    </nav>
  );
}
