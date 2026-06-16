import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const ACCESS_TOKEN_STORAGE_KEY = 'memento.accessToken';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const FIRST_POST_ID = '22222222-2222-2222-2222-222222222222';

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

function noContentResponse() {
  return new Response(null, { status: 204 });
}

function authMeResponse() {
  return {
    id: USER_ID,
    email: 'user@example.com',
    nickname: 'cutan',
    friendAiSharingEnabled: false,
    createdAt: '2026-06-15T03:10:00Z',
  };
}

function postSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FIRST_POST_ID,
    author: {
      id: USER_ID,
      nickname: 'cutan',
    },
    title: '비 오는 날 회고',
    contentPreview: '오늘은 비가 와서 프로젝트 회고를 길게 남겼다.',
    tags: ['회고'],
    commentCount: 0,
    likeCount: 0,
    likedByMe: false,
    accessScope: 'me',
    memoryStatus: 'pending',
    createdAt: '2026-06-15T03:10:00Z',
    updatedAt: '2026-06-15T03:10:00Z',
    ...overrides,
  };
}

function postDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...postSummary(),
    content: '오늘은 비가 와서 프로젝트 회고를 길게 남겼다.\n다음에는 더 작게 쪼개서 진행한다.',
    recentComments: [],
    ...overrides,
  };
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

  it('supports the preview sidebar collapse pattern in the app shell', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
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

    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { name: '내 기억' })).toBeInTheDocument();
    const shell = container.querySelector('.app-shell');
    const desktopSidebar = container.querySelector('.desktop-sidebar');
    expect(shell).not.toHaveClass('collapsed');
    expect(desktopSidebar?.querySelector('.wordmark-full')).toHaveTextContent('Memento');
    expect(desktopSidebar?.querySelector('.wordmark-mini')).toHaveTextContent('M');

    fireEvent.click(screen.getByRole('button', { name: '사이드바 접기' }));

    expect(shell).toHaveClass('collapsed');
    expect(screen.getByRole('button', { name: '사이드바 펼치기' })).toBeInTheDocument();
  });

  it('provides a mobile drawer menu instead of hiding navigation completely', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
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

    const { container } = render(<App />);

    expect(await screen.findByRole('heading', { name: '내 기억' })).toBeInTheDocument();
    const drawer = container.querySelector('.mobile-drawer');
    expect(drawer).not.toHaveClass('open');

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));

    expect(drawer).toHaveClass('open');
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toBeInTheDocument();
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

  it('uses the preview primary button icon treatment on auth actions', () => {
    window.history.pushState({}, '', '/login');

    const { container } = render(<App />);
    const loginButton = screen.getByRole('button', { name: '로그인' });

    expect(loginButton).toHaveClass('button-primary');
    expect(container.querySelector('.button-icon')).toBeInTheDocument();
  });

  it('loads the authenticated post feed and opens a post detail', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/posts?')) {
        return jsonResponse({
          items: [postSummary()],
          page: {
            page: 0,
            size: 20,
            totalCount: 1,
            totalPages: 1,
          },
        });
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail());
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: '내 기억' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /비 오는 날 회고/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /비 오는 날 회고/ }));

    expect(
      await screen.findByRole('heading', { name: '비 오는 날 회고' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/다음에는 더 작게 쪼개서 진행한다/)).toBeInTheDocument();
  });

  it('creates a post and navigates to the created detail page', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/posts?')) {
        return jsonResponse({
          items: [],
          page: {
            page: 0,
            size: 20,
            totalCount: 0,
            totalPages: 0,
          },
        });
      }
      if (url.endsWith('/posts') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          title: '새 기록',
          content: '처음 남기는 텍스트 기억',
          tagNames: [],
        });
        return jsonResponse(
          postDetail({
            title: '새 기록',
            content: '처음 남기는 텍스트 기억',
            tags: [],
          }),
          { status: 201 },
        );
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(
          postDetail({
            title: '새 기록',
            content: '처음 남기는 텍스트 기억',
            tags: [],
          }),
        );
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('link', { name: '첫 기록 작성' }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '새 기록' },
    });
    fireEvent.change(screen.getByLabelText('본문'), {
      target: { value: '처음 남기는 텍스트 기억' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(window.location.pathname).toBe(`/app/posts/${FIRST_POST_ID}`));
    expect(await screen.findByRole('heading', { name: '새 기록' })).toBeInTheDocument();
  });

  it('prefills, updates, and deletes an existing post', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let detailTitle = '비 오는 날 회고';
    let detailContent = '오늘은 비가 와서 프로젝트 회고를 길게 남겼다.';
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`) && init?.method === 'PUT') {
        const body = JSON.parse(String(init.body));
        expect(body).toEqual({
          title: '수정된 회고',
          content: '내용을 더 구체적으로 고쳤다.',
          tagNames: ['회고'],
        });
        detailTitle = body.title;
        detailContent = body.content;
        return jsonResponse(
          postDetail({
            title: detailTitle,
            content: detailContent,
          }),
        );
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`) && init?.method === 'DELETE') {
        return noContentResponse();
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(
          postDetail({
            title: detailTitle,
            content: detailContent,
          }),
        );
      }
      if (url.includes('/posts?')) {
        return jsonResponse({
          items: [],
          page: {
            page: 0,
            size: 20,
            totalCount: 0,
            totalPages: 0,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '비 오는 날 회고' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: '수정' }));
    expect(await screen.findByDisplayValue('비 오는 날 회고')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '수정된 회고' },
    });
    fireEvent.change(screen.getByLabelText('본문'), {
      target: { value: '내용을 더 구체적으로 고쳤다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(
      await screen.findByRole('heading', { name: '수정된 회고' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(window.location.pathname).toBe('/app'));
    expect(await screen.findByText('아직 기록이 없어요')).toBeInTheDocument();
  });
});
