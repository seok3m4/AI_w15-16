import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const ACCESS_TOKEN_STORAGE_KEY = 'memento.accessToken';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const FIRST_POST_ID = '22222222-2222-2222-2222-222222222222';
const FIRST_COMMENT_ID = '33333333-3333-3333-3333-333333333333';

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

function commentResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FIRST_COMMENT_ID,
    postId: FIRST_POST_ID,
    author: {
      id: USER_ID,
      nickname: 'cutan',
    },
    content: '첫 댓글을 남겼다.',
    createdAt: '2026-06-15T03:15:00Z',
    updatedAt: '2026-06-15T03:15:00Z',
    ...overrides,
  };
}

function tagListResponse(items: Array<{ id: string; name: string; postCount: number }> = []) {
  return {
    items,
    page: {
      page: 0,
      size: 50,
      totalCount: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
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

  it('renders comments on the post detail page', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ commentCount: 1 }));
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        return jsonResponse({
          items: [commentResponse()],
          page: {
            page: 0,
            size: 20,
            totalCount: 1,
            totalPages: 1,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '비 오는 날 회고' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('첫 댓글을 남겼다.')).toBeInTheDocument();
    expect(screen.getByLabelText('댓글 입력')).toBeInTheDocument();
  });

  it('loads additional comment pages from the post detail page', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const comments = Array.from({ length: 21 }, (_, index) =>
      commentResponse({
        id: `33333333-3333-3333-3333-${String(index + 1).padStart(12, '0')}`,
        content: `페이지 댓글 ${index + 1}`,
      }),
    );
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ commentCount: comments.length }));
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        const searchParams = new URL(url).searchParams;
        const page = Number(searchParams.get('page') ?? '0');
        const size = Number(searchParams.get('size') ?? '20');
        const start = page * size;
        return jsonResponse({
          items: comments.slice(start, start + size),
          page: {
            page,
            size,
            totalCount: comments.length,
            totalPages: 2,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('페이지 댓글 1')).toBeInTheDocument();
    expect(screen.queryByText('페이지 댓글 21')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 더 불러오기' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`page=1`),
        expect.objectContaining({ method: 'GET' }),
      ),
    );
    expect(await screen.findByText('페이지 댓글 21')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '댓글 더 불러오기' })).not.toBeInTheDocument();
  });

  it('creates a comment from the post detail page', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const comments: Array<ReturnType<typeof commentResponse>> = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ commentCount: comments.length }));
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`) && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ content: '새 댓글' });
        const created = commentResponse({
          content: '새 댓글',
          createdAt: '2026-06-15T03:20:00Z',
          updatedAt: '2026-06-15T03:20:00Z',
        });
        comments.push(created);
        return jsonResponse(created, { status: 201 });
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        return jsonResponse({
          items: comments,
          page: {
            page: 0,
            size: 20,
            totalCount: comments.length,
            totalPages: comments.length > 0 ? 1 : 0,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('첫 댓글을 남겨보세요')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('댓글 입력'), {
      target: { value: '새 댓글' },
    });
    fireEvent.click(screen.getByRole('button', { name: '작성' }));

    expect(await screen.findByText('새 댓글')).toBeInTheDocument();
    expect(screen.getByText('댓글 1')).toBeInTheDocument();
  });

  it('updates an existing comment inline from the post detail page', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let comment = commentResponse();
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ commentCount: 1 }));
      }
      if (url.endsWith(`/comments/${FIRST_COMMENT_ID}`) && init?.method === 'PUT') {
        expect(JSON.parse(String(init.body))).toEqual({ content: '수정한 댓글' });
        comment = commentResponse({
          content: '수정한 댓글',
          updatedAt: '2026-06-15T03:25:00Z',
        });
        return jsonResponse(comment);
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        return jsonResponse({
          items: [comment],
          page: {
            page: 0,
            size: 20,
            totalCount: 1,
            totalPages: 1,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('첫 댓글을 남겼다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 수정' }));
    fireEvent.change(screen.getByLabelText('댓글 수정 입력'), {
      target: { value: '수정한 댓글' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/comments/${FIRST_COMMENT_ID}`),
        expect.objectContaining({ method: 'PUT' }),
      ),
    );
    expect(await screen.findByText('수정한 댓글')).toBeInTheDocument();
  });

  it('deletes an existing comment from the post detail page', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let comments = [commentResponse()];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ commentCount: comments.length }));
      }
      if (url.endsWith(`/comments/${FIRST_COMMENT_ID}`) && init?.method === 'DELETE') {
        comments = [];
        return noContentResponse();
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        return jsonResponse({
          items: comments,
          page: {
            page: 0,
            size: 20,
            totalCount: comments.length,
            totalPages: comments.length > 0 ? 1 : 0,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('첫 댓글을 남겼다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/comments/${FIRST_COMMENT_ID}`),
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    expect(await screen.findByText('첫 댓글을 남겨보세요')).toBeInTheDocument();
    expect(screen.queryByText('첫 댓글을 남겼다.')).not.toBeInTheDocument();
    expect(screen.getByText('댓글 0')).toBeInTheDocument();
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
      if (url.includes('/tags?')) {
        return jsonResponse(tagListResponse());
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

  it('loads existing tag suggestions and saves selected tag names when creating a post', async () => {
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
      if (url.includes('/tags?')) {
        return jsonResponse(
          tagListResponse([
            { id: '33333333-3333-3333-3333-333333333333', name: '회고', postCount: 2 },
            { id: '44444444-4444-4444-4444-444444444444', name: '프로젝트', postCount: 1 },
          ]),
        );
      }
      if (url.endsWith('/posts') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          title: '태그 기록',
          content: '태그 입력을 확인한다.',
          tagNames: ['회고', '카페'],
        });
        return jsonResponse(
          postDetail({
            title: '태그 기록',
            content: '태그 입력을 확인한다.',
            tags: ['회고', '카페'],
          }),
          { status: 201 },
        );
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(
          postDetail({
            title: '태그 기록',
            content: '태그 입력을 확인한다.',
            tags: ['회고', '카페'],
          }),
        );
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('link', { name: '첫 기록 작성' }));
    fireEvent.click(await screen.findByRole('button', { name: /#회고/ }));
    fireEvent.change(screen.getByLabelText('태그'), {
      target: { value: '카페' },
    });
    fireEvent.keyDown(screen.getByLabelText('태그'), { key: 'Enter' });
    expect(screen.getByRole('button', { name: '회고 태그 제거' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '카페 태그 제거' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '태그 기록' },
    });
    fireEvent.change(screen.getByLabelText('본문'), {
      target: { value: '태그 입력을 확인한다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(window.location.pathname).toBe(`/app/posts/${FIRST_POST_ID}`));
    expect(await screen.findByRole('heading', { name: '태그 기록' })).toBeInTheDocument();
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
      if (url.includes('/tags?')) {
        return jsonResponse(
          tagListResponse([
            { id: '33333333-3333-3333-3333-333333333333', name: '회고', postCount: 1 },
          ]),
        );
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
