import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const ACCESS_TOKEN_STORAGE_KEY = 'memento.accessToken';

function mockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  vi.stubGlobal('fetch', vi.fn(handler));
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('App auth flow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('shows the login screen on /login', () => {
    window.history.pushState({}, '', '/login');

    render(<App />);

    expect(
      screen.getByRole('heading', { name: '기억을 다시 꺼내 쓰는 공간' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('redirects protected routes to login when no access token exists', async () => {
    window.history.pushState({}, '', '/app');

    render(<App />);

    expect(await screen.findByRole('button', { name: '로그인' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
  });

  it('logs in, stores the access token, and enters the protected app shell', async () => {
    window.history.pushState({}, '', '/login');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/login') && init?.method === 'POST') {
        return jsonResponse({
          accessToken: 'access-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
          user: {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'user@example.com',
            nickname: 'cutan',
          },
        });
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'user@example.com',
          nickname: 'cutan',
          friendAiSharingEnabled: false,
          createdAt: '2026-06-15T03:10:00Z',
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password1234!' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByRole('heading', { name: '내 기억' })).toBeInTheDocument();
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('access-token');
    expect(screen.getByText('cutan')).toBeInTheDocument();
  });

  it('refreshes once after a protected request returns 401', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'expired-token');
    let meCalls = 0;

    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        meCalls += 1;
        if (meCalls === 1) {
          return jsonResponse({ detail: 'Unauthorized' }, { status: 401 });
        }
        expect(init?.headers).toEqual(
          expect.objectContaining({ Authorization: 'Bearer fresh-token' }),
        );
        return jsonResponse({
          id: '11111111-1111-1111-1111-111111111111',
          email: 'user@example.com',
          nickname: 'cutan',
          friendAiSharingEnabled: false,
          createdAt: '2026-06-15T03:10:00Z',
        });
      }
      if (url.endsWith('/auth/refresh') && init?.method === 'POST') {
        return jsonResponse({
          accessToken: 'fresh-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: '내 기억' })).toBeInTheDocument();
    expect(sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('fresh-token');
    expect(meCalls).toBe(2);
  });

  it('signs up and returns to the login screen', async () => {
    window.history.pushState({}, '', '/signup');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/signup') && init?.method === 'POST') {
        return jsonResponse(
          {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'user@example.com',
            nickname: 'cutan',
            friendAiSharingEnabled: false,
            createdAt: '2026-06-15T03:10:00Z',
          },
          { status: 201 },
        );
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.change(screen.getByLabelText('닉네임'), {
      target: { value: 'cutan' },
    });
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password1234!' },
    });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(
      await screen.findByText('가입이 완료되었습니다. 로그인해 주세요.'),
    ).toBeInTheDocument();
  });
});
