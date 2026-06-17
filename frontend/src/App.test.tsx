import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const ACCESS_TOKEN_STORAGE_KEY = 'memento.accessToken';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const FIRST_POST_ID = '22222222-2222-2222-2222-222222222222';
const FIRST_COMMENT_ID = '33333333-3333-3333-3333-333333333333';
const FRIEND_ID = '44444444-4444-4444-4444-444444444444';
const FRIENDSHIP_ID = '55555555-5555-5555-5555-555555555555';
const CAPSULE_ID = '66666666-6666-6666-6666-666666666666';
const CHUNK_ID = '77777777-7777-7777-7777-777777777777';

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

function memorySearchResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    query: 'meeting summary',
    scope: 'me',
    results: [],
    ...overrides,
  };
}

function memorySummaryResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    query: 'meeting',
    answer: '회의 기록에서는 제품 리스크와 일정 조율이 핵심이었습니다.',
    usedFriendContext: false,
    sources: [
      {
        ownerUserId: USER_ID,
        ownerNickname: 'cutan',
        postId: FIRST_POST_ID,
        title: 'Meeting notes',
        sourceType: 'post',
        summary: 'Discussed product risks and timeline.',
      },
    ],
    ...overrides,
  };
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

function friendshipItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: FRIENDSHIP_ID,
    user: {
      id: FRIEND_ID,
      nickname: '하윤서',
    },
    status: 'accepted',
    direction: 'incoming',
    createdAt: '2026-06-15T03:10:00Z',
    updatedAt: '2026-06-15T03:10:00Z',
    ...overrides,
  };
}

function capsuleSummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: CAPSULE_ID,
    title: '프로젝트 인수인계',
    purpose: '외부 LLM에게 최근 프로젝트 맥락 전달',
    containsFriendContext: false,
    createdAt: '2026-06-17T00:00:00Z',
    updatedAt: '2026-06-17T00:00:00Z',
    ...overrides,
  };
}

function capsuleDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ...capsuleSummary(),
    query: '최근 프로젝트 결정사항',
    summary: '인증, 친구 권한, Capsule 흐름을 정리했다.',
    keyFacts: ['JWT Bearer 인증을 사용한다.', 'Capsule은 본인 memory 근거만 사용한다.'],
    tags: ['project', 'handoff'],
    sources: [
      {
        postId: FIRST_POST_ID,
        chunkId: CHUNK_ID,
        ownerUserId: USER_ID,
        ownerNickname: 'cutan',
        title: 'API 결정',
        snippet: 'JWT와 Capsule compact context 구조를 결정했다.',
        sourceType: 'post',
        createdAt: '2026-06-15T03:10:00Z',
      },
    ],
    ...overrides,
  };
}

function compactContextResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    purpose: '외부 LLM에게 최근 프로젝트 맥락 전달',
    summary: '인증, 친구 권한, Capsule 흐름을 정리했다.',
    keyFacts: ['JWT Bearer 인증을 사용한다.'],
    sourcePostIds: [FIRST_POST_ID],
    tags: ['project'],
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

  it('navigates from the feed search box to keyword search results', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const postRequests: string[] = [];
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/posts?')) {
        postRequests.push(url);
        const searchParams = new URL(url).searchParams;
        const query = searchParams.get('q');
        return jsonResponse({
          items: query === 'memo' ? [postSummary({ title: 'Memo match' })] : [],
          page: {
            page: Number(searchParams.get('page') ?? '0'),
            size: 20,
            totalCount: query === 'memo' ? 1 : 0,
            totalPages: query === 'memo' ? 1 : 0,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Search posts'), {
      target: { value: 'memo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(window.location.pathname).toBe('/app/search'));
    expect(new URLSearchParams(window.location.search).get('q')).toBe('memo');
    expect(await screen.findByRole('link', { name: /Memo match/ })).toBeInTheDocument();
    expect(
      postRequests.some((url) => {
        const searchParams = new URL(url).searchParams;
        return (
          searchParams.get('q') === 'memo' &&
          searchParams.get('scope') === 'me' &&
          searchParams.get('page') === '0'
        );
      }),
    ).toBe(true);
  });

  it('keeps search query, tag filter, and page in the search URL and API request', async () => {
    window.history.pushState({}, '', '/app/search?q=memo&tag=project');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const postRequests: string[] = [];
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/posts?')) {
        postRequests.push(url);
        const searchParams = new URL(url).searchParams;
        const page = Number(searchParams.get('page') ?? '0');
        return jsonResponse({
          items: [
            postSummary({
              id: `22222222-2222-2222-2222-${String(page + 1).padStart(12, '0')}`,
              title: page === 0 ? 'First memo match' : 'Second memo match',
              tags: ['project'],
            }),
          ],
          page: {
            page,
            size: 20,
            totalCount: 21,
            totalPages: 2,
          },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('link', { name: /First memo match/ })).toBeInTheDocument();
    expect(
      postRequests.some((url) => {
        const searchParams = new URL(url).searchParams;
        return (
          searchParams.get('q') === 'memo' &&
          searchParams.get('tag') === 'project' &&
          searchParams.get('scope') === 'me' &&
          searchParams.get('page') === '0'
        );
      }),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() =>
      expect(new URLSearchParams(window.location.search).get('page')).toBe('1'),
    );
    expect(await screen.findByRole('link', { name: /Second memo match/ })).toBeInTheDocument();
    expect(
      postRequests.some((url) => {
        const searchParams = new URL(url).searchParams;
        return (
          searchParams.get('q') === 'memo' &&
          searchParams.get('tag') === 'project' &&
          searchParams.get('scope') === 'me' &&
          searchParams.get('page') === '1'
        );
      }),
    ).toBe(true);
  });

  it('opens the friends page and sends a UUID-based friend request', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const requestedAddressees: string[] = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/friendships?') && init?.method !== 'POST') {
        const status = new URL(url).searchParams.get('status');
        const items = status === 'accepted' ? [friendshipItem()] : [];
        return jsonResponse({
          items,
          page: {
            page: 0,
            size: 20,
            totalCount: items.length,
            totalPages: items.length > 0 ? 1 : 0,
          },
        });
      }
      if (url.endsWith('/friendships/requests') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        requestedAddressees.push(body.addresseeUserId);
        return jsonResponse(friendshipItem({ status: 'pending', direction: 'outgoing' }), {
          status: 201,
        });
      }
      if (url.includes('/posts?')) {
        return jsonResponse({
          items: [],
          page: { page: 0, size: 20, totalCount: 0, totalPages: 0 },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.click((await screen.findAllByRole('link', { name: '친구' }))[0]);
    expect(await screen.findByRole('heading', { name: '친구' })).toBeInTheDocument();
    expect(await screen.findByText('하윤서')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('친구 사용자 UUID'), {
      target: { value: FRIEND_ID },
    });
    fireEvent.click(screen.getByRole('button', { name: '친구 요청' }));

    await waitFor(() => expect(requestedAddressees).toEqual([FRIEND_ID]));
    expect(await screen.findByText('친구 요청을 보냈습니다.')).toBeInTheDocument();
  });

  it('accepts an incoming friend request from the friends page', async () => {
    window.history.pushState({}, '', '/app/friends');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let accepted = false;
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/friendships?')) {
        const status = new URL(url).searchParams.get('status');
        const items =
          status === 'pending' && !accepted
            ? [friendshipItem({ status: 'pending', direction: 'incoming' })]
            : status === 'accepted' && accepted
              ? [friendshipItem()]
              : [];
        return jsonResponse({
          items,
          page: {
            page: 0,
            size: 20,
            totalCount: items.length,
            totalPages: items.length > 0 ? 1 : 0,
          },
        });
      }
      if (url.endsWith(`/friendships/${FRIENDSHIP_ID}/accept`) && init?.method === 'POST') {
        accepted = true;
        return jsonResponse({
          id: FRIENDSHIP_ID,
          status: 'accepted',
          updatedAt: '2026-06-15T03:20:00Z',
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('받은 요청 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수락' }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/friendships/${FRIENDSHIP_ID}/accept`),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText('친구 요청을 수락했습니다.')).toBeInTheDocument();
  });

  it('loads the friend feed with scope=friends and toggles likes', async () => {
    window.history.pushState({}, '', '/app/friends/feed');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let likedByMe = false;
    let likeCount = 2;
    const postRequests: string[] = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/posts?')) {
        postRequests.push(url);
        return jsonResponse({
          items: [
            postSummary({
              author: { id: FRIEND_ID, nickname: '하윤서' },
              title: '친구의 회고',
              accessScope: 'friend',
              likedByMe,
              likeCount,
            }),
          ],
          page: { page: 0, size: 20, totalCount: 1, totalPages: 1 },
        });
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}/likes`) && init?.method === 'POST') {
        likedByMe = true;
        likeCount = 3;
        return jsonResponse({ postId: FIRST_POST_ID, likedByMe, likeCount });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: '친구 기록' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /친구의 회고/ })).toBeInTheDocument();
    expect(
      postRequests.some((url) => new URL(url).searchParams.get('scope') === 'friends'),
    ).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '좋아요' }));

    expect(await screen.findByRole('button', { name: '좋아요 취소' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('updates friend AI sharing from the settings page', async () => {
    window.history.pushState({}, '', '/app/settings');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let enabled = false;
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse({ ...authMeResponse(), friendAiSharingEnabled: enabled });
      }
      if (url.endsWith('/privacy/ai-sharing') && init?.method === 'PUT') {
        expect(JSON.parse(String(init.body))).toEqual({ enabled: true });
        enabled = true;
        return jsonResponse({
          friendAiSharingEnabled: enabled,
          updatedAt: '2026-06-15T03:20:00Z',
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: '설정' })).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: '친구 AI 공유 동의' });
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(await screen.findByText('AI 공유 동의를 켰습니다.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '친구 AI 공유 동의' })).toBeChecked();
  });

  it('opens the capsule list from navigation and loads capsules', async () => {
    window.history.pushState({}, '', '/app');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const capsuleRequests: string[] = [];
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/context-capsules?')) {
        capsuleRequests.push(url);
        return jsonResponse({
          items: [capsuleSummary()],
          page: { page: 0, size: 20, totalCount: 1, totalPages: 1 },
        });
      }
      if (url.includes('/posts?')) {
        return jsonResponse({
          items: [],
          page: { page: 0, size: 20, totalCount: 0, totalPages: 0 },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.click((await screen.findAllByRole('link', { name: 'Capsule' }))[0]);

    expect(await screen.findByRole('heading', { name: '컨텍스트 캡슐' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '프로젝트 인수인계' })).toBeInTheDocument();
    expect(
      capsuleRequests.some((url) => new URL(url).searchParams.get('page') === '0'),
    ).toBe(true);
  });

  it('creates a query-based capsule and navigates to detail', async () => {
    window.history.pushState({}, '', '/app/capsules/new');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/context-capsules') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          title: '프로젝트 인수인계',
          purpose: '외부 LLM에게 최근 프로젝트 맥락 전달',
          query: '최근 프로젝트 결정사항',
          scope: 'me',
          sourcePostIds: null,
        });
        return jsonResponse(capsuleDetail(), { status: 201 });
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`)) {
        return jsonResponse(capsuleDetail());
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}/compact-context`)) {
        return jsonResponse(compactContextResponse());
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: '새 컨텍스트 캡슐' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '프로젝트 인수인계' },
    });
    fireEvent.change(screen.getByLabelText('목적'), {
      target: { value: '외부 LLM에게 최근 프로젝트 맥락 전달' },
    });
    fireEvent.change(screen.getByLabelText('Memory Search 쿼리'), {
      target: { value: '최근 프로젝트 결정사항' },
    });
    fireEvent.click(screen.getByRole('button', { name: '생성' }));

    await waitFor(() => expect(window.location.pathname).toBe(`/app/capsules/${CAPSULE_ID}`));
    expect(
      await screen.findByRole('heading', { name: '프로젝트 인수인계' }),
    ).toBeInTheDocument();
  });

  it('creates a capsule with normalized source post ids', async () => {
    window.history.pushState({}, '', '/app/capsules/new');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const sentBodies: unknown[] = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/context-capsules') && init?.method === 'POST') {
        sentBodies.push(JSON.parse(String(init.body)));
        return jsonResponse(capsuleDetail(), { status: 201 });
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`)) {
        return jsonResponse(capsuleDetail());
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}/compact-context`)) {
        return jsonResponse(compactContextResponse());
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    fireEvent.change(await screen.findByLabelText('제목'), {
      target: { value: '근거 지정 캡슐' },
    });
    fireEvent.change(screen.getByLabelText('목적'), {
      target: { value: '특정 게시글만 전달' },
    });
    fireEvent.change(screen.getByLabelText('근거 게시물 UUID'), {
      target: { value: `${FIRST_POST_ID},\n${FIRST_POST_ID}` },
    });
    fireEvent.click(screen.getByRole('button', { name: '생성' }));

    await waitFor(() =>
      expect(sentBodies).toEqual([
        {
          title: '근거 지정 캡슐',
          purpose: '특정 게시글만 전달',
          query: null,
          scope: 'me',
          sourcePostIds: [FIRST_POST_ID],
        },
      ]),
    );
  });

  it('shows capsule detail, copies compact JSON, updates, and deletes it', async () => {
    window.history.pushState({}, '', `/app/capsules/${CAPSULE_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    let detail = capsuleDetail();
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}/compact-context`)) {
        return jsonResponse(compactContextResponse());
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`) && init?.method === 'PUT') {
        expect(JSON.parse(String(init.body))).toEqual({
          title: '수정된 캡슐',
          purpose: '업데이트된 목적',
        });
        detail = capsuleDetail({
          title: '수정된 캡슐',
          purpose: '업데이트된 목적',
        });
        return jsonResponse(detail);
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`) && init?.method === 'DELETE') {
        return noContentResponse();
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`)) {
        return jsonResponse(detail);
      }
      if (url.includes('/context-capsules?')) {
        return jsonResponse({
          items: [],
          page: { page: 0, size: 20, totalCount: 0, totalPages: 0 },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: '프로젝트 인수인계' }),
    ).toBeInTheDocument();
    expect(screen.getByText('JWT Bearer 인증을 사용한다.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /API 결정/ })).toHaveAttribute(
      'href',
      `/app/posts/${FIRST_POST_ID}`,
    );

    fireEvent.click(await screen.findByRole('button', { name: '복사' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        JSON.stringify(compactContextResponse(), null, 2),
      ),
    );
    expect(await screen.findByText('compact JSON을 복사했습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByLabelText('제목'), {
      target: { value: '수정된 캡슐' },
    });
    fireEvent.change(screen.getByLabelText('목적'), {
      target: { value: '업데이트된 목적' },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));

    expect(await screen.findByText('캡슐을 수정했습니다.')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '수정된 캡슐' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(window.location.pathname).toBe('/app/capsules'));
  });

  it('shows a not-found state for an inaccessible capsule', async () => {
    window.history.pushState({}, '', `/app/capsules/${CAPSULE_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}`)) {
        return jsonResponse(
          {
            code: 'CAPSULE_NOT_FOUND',
            detail: 'Context capsule was not found.',
          },
          { status: 404 },
        );
      }
      if (url.endsWith(`/context-capsules/${CAPSULE_ID}/compact-context`)) {
        return jsonResponse({ detail: 'Not found' }, { status: 404 });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('찾을 수 없는 캡슐입니다.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: '목록으로' })[0]).toHaveAttribute(
      'href',
      '/app/capsules',
    );
  });

  it('shows the memory search empty state without query parameters', async () => {
    window.history.pushState({}, '', '/app/memory-search');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Search your memory' })).toBeInTheDocument();
    expect(screen.getByText('Start with a natural-language query')).toBeInTheDocument();
  });

  it('shows memory search results from /memory-search', async () => {
    window.history.pushState({}, '', '/app/memory-search?q=meeting');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/memory-search')) {
        expect(init?.method).toBe('POST');
        return jsonResponse(
          memorySearchResponse({
            query: 'meeting',
            results: [
              {
                postId: FIRST_POST_ID,
                chunkId: 'chunk-1',
                ownerUserId: USER_ID,
                ownerNickname: 'cutan',
                title: 'Meeting notes',
                snippet: 'Discussed product risks and timeline.',
                score: 0.8421,
                sourceType: 'post',
                createdAt: '2026-06-15T03:10:00Z',
              },
            ],
          }),
        );
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    const resultLink = await screen.findByRole('link', { name: 'Meeting notes' });
    expect(await screen.findByRole('heading', { name: 'Search your memory' })).toBeInTheDocument();
    expect(screen.getByText('Discussed product risks and timeline.')).toBeInTheDocument();
    expect(screen.getByText('score 0.842')).toBeInTheDocument();
    expect(resultLink).toHaveAttribute('href', `/app/posts/${FIRST_POST_ID}`);
  });

  it('requests an AI summary for memory search results and renders citations', async () => {
    window.history.pushState({}, '', '/app/memory-search?q=meeting');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    const summaryRequests: unknown[] = [];
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/memory-search') && init?.method === 'POST') {
        return jsonResponse(
          memorySearchResponse({
            query: 'meeting',
            results: [
              {
                postId: FIRST_POST_ID,
                chunkId: 'chunk-1',
                ownerUserId: USER_ID,
                ownerNickname: 'cutan',
                title: 'Meeting notes',
                snippet: 'Discussed product risks and timeline.',
                score: 0.8421,
                sourceType: 'post',
                createdAt: '2026-06-15T03:10:00Z',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/memory-search/summarize') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        summaryRequests.push(body);
        return jsonResponse(memorySummaryResponse());
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('link', { name: 'Meeting notes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI 요약 보기' }));

    expect(
      await screen.findByText('회의 기록에서는 제품 리스크와 일정 조율이 핵심이었습니다.'),
    ).toBeInTheDocument();
    expect(summaryRequests).toEqual([
      {
        query: 'meeting',
        scope: 'me',
        sourcePostIds: [FIRST_POST_ID],
        maxSources: 5,
      },
    ]);
    expect(
      screen
        .getAllByRole('link', { name: /Meeting notes/ })
        .some((link) => link.getAttribute('href') === `/app/posts/${FIRST_POST_ID}`),
    ).toBe(true);
    expect(screen.getAllByText('Discussed product risks and timeline.')).toHaveLength(2);
  });

  it('polls a memory summary job and renders the completed result', async () => {
    window.history.pushState({}, '', '/app/memory-search?q=meeting');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let jobCalls = 0;
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/memory-search') && init?.method === 'POST') {
        return jsonResponse(
          memorySearchResponse({
            query: 'meeting',
            results: [
              {
                postId: FIRST_POST_ID,
                chunkId: 'chunk-1',
                ownerUserId: USER_ID,
                ownerNickname: 'cutan',
                title: 'Meeting notes',
                snippet: 'Discussed product risks and timeline.',
                score: 0.8421,
                sourceType: 'post',
                createdAt: '2026-06-15T03:10:00Z',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/memory-search/summarize') && init?.method === 'POST') {
        return jsonResponse(
          {
            id: '66666666-6666-6666-6666-666666666666',
            type: 'memory_summarize',
            status: 'running',
            progress: 15,
            retryable: true,
            result: null,
            error: null,
            createdAt: '2026-06-15T03:10:00Z',
            updatedAt: '2026-06-15T03:10:00Z',
            completedAt: null,
          },
          { status: 202 },
        );
      }
      if (url.endsWith('/jobs/66666666-6666-6666-6666-666666666666')) {
        jobCalls += 1;
        return jsonResponse({
          id: '66666666-6666-6666-6666-666666666666',
          type: 'memory_summarize',
          status: jobCalls > 1 ? 'succeeded' : 'running',
          progress: jobCalls > 1 ? 100 : 45,
          retryable: true,
          result: jobCalls > 1 ? memorySummaryResponse() : null,
          error: null,
          createdAt: '2026-06-15T03:10:00Z',
          updatedAt: '2026-06-15T03:10:10Z',
          completedAt: jobCalls > 1 ? '2026-06-15T03:10:10Z' : null,
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('link', { name: 'Meeting notes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI 요약 보기' }));

    expect(await screen.findByText(/Memory summary job:/)).toBeInTheDocument();
    expect(
      await screen.findByText('회의 기록에서는 제품 리스크와 일정 조율이 핵심이었습니다.'),
    ).toBeInTheDocument();
    expect(jobCalls).toBeGreaterThanOrEqual(2);
  });

  it('keeps memory search results visible when AI summary fails', async () => {
    window.history.pushState({}, '', '/app/memory-search?q=meeting');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/memory-search') && init?.method === 'POST') {
        return jsonResponse(
          memorySearchResponse({
            query: 'meeting',
            results: [
              {
                postId: FIRST_POST_ID,
                chunkId: 'chunk-1',
                ownerUserId: USER_ID,
                ownerNickname: 'cutan',
                title: 'Meeting notes',
                snippet: 'Discussed product risks and timeline.',
                score: 0.8421,
                sourceType: 'post',
                createdAt: '2026-06-15T03:10:00Z',
              },
            ],
          }),
        );
      }
      if (url.endsWith('/memory-search/summarize') && init?.method === 'POST') {
        return jsonResponse(
          {
            code: 'SUMMARY_PROVIDER_UNAVAILABLE',
            detail: 'Summary provider unavailable.',
          },
          { status: 502 },
        );
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('link', { name: 'Meeting notes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI 요약 보기' }));

    expect(
      await screen.findByText('검색 결과는 있지만 요약을 생성하지 못했어요'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meeting notes' })).toBeInTheDocument();
    expect(screen.getByText('Discussed product risks and timeline.')).toBeInTheDocument();
  });

  it('falls back to keyword search when memory search returns no results', async () => {
    window.history.pushState({}, '', '/app/memory-search?q=meeting');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/memory-search')) {
        return jsonResponse(memorySearchResponse({ query: 'meeting' }));
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    const keywordLink = await screen.findByRole('link', { name: 'Search as keyword instead' });
    fireEvent.click(keywordLink);

    await waitFor(() => expect(window.location.pathname).toBe('/app/search'));
    expect(new URLSearchParams(window.location.search).get('q')).toBe('meeting');
  });

  it('starts memory reindex and polls job status from post detail', async () => {
    window.history.pushState({}, '', `/app/posts/${FIRST_POST_ID}`);
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let jobCalls = 0;
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}`)) {
        return jsonResponse(postDetail({ memoryStatus: 'failed', accessScope: 'me' }));
      }
      if (url.includes(`/posts/${FIRST_POST_ID}/comments`)) {
        return jsonResponse({
          items: [],
          page: { page: 0, size: 20, totalCount: 0, totalPages: 0 },
        });
      }
      if (url.endsWith(`/posts/${FIRST_POST_ID}/memory-status`)) {
        return jsonResponse({
          postId: FIRST_POST_ID,
          chunkStatus: 'failed',
          embeddingStatus: 'failed',
          lastIndexedAt: '2026-06-15T03:09:00Z',
          failureReason: 'Initial embedding failed.',
        });
      }
      if (url.endsWith('/memories/reindex') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          postIds: [FIRST_POST_ID],
          reason: 'manual-reindex',
        });
        return jsonResponse({
          id: 'job-1',
          type: 'memory_reindex',
          status: 'running',
          progress: 5,
          retryable: false,
          result: null,
          error: null,
          createdAt: '2026-06-15T03:10:00Z',
          updatedAt: '2026-06-15T03:10:00Z',
          completedAt: null,
        });
      }
      if (url.endsWith('/jobs/job-1')) {
        jobCalls += 1;
        return jsonResponse({
          id: 'job-1',
          type: 'memory_reindex',
          status: jobCalls > 2 ? 'succeeded' : 'running',
          progress: jobCalls > 2 ? 100 : 50,
          retryable: false,
          result: null,
          error: null,
          createdAt: '2026-06-15T03:10:00Z',
          updatedAt: '2026-06-15T03:10:10Z',
          completedAt: jobCalls > 2 ? '2026-06-15T03:10:10Z' : null,
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    const reindexButton = await screen.findByRole('button', { name: 'Reindex memory' });
    fireEvent.click(reindexButton);

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/memories/reindex'),
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByText(/Memory job:/)).toBeInTheDocument();
    await waitFor(() => expect(jobCalls).toBeGreaterThanOrEqual(1));
  });

  it('opens a friend gift recommendation page and shows recommendations with sources', async () => {
    window.history.pushState({}, '', '/app/friends');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.includes('/friendships?')) {
        const status = new URL(url).searchParams.get('status');
        const items =
          status === 'accepted'
            ? [
                friendshipItem({
                  user: {
                    id: FRIEND_ID,
                    nickname: 'gift friend',
                    friendAiSharingEnabled: true,
                  },
                }),
              ]
            : [];
        return jsonResponse({
          items,
          page: { page: 0, size: 20, totalCount: items.length, totalPages: 1 },
        });
      }
      if (url.endsWith(`/friends/${FRIEND_ID}/gift-recommendations`) && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          occasion: 'birthday',
          budget: { min: 30000, max: 70000, currency: 'KRW' },
          preferences: 'coffee',
          maxSources: 5,
        });
        return jsonResponse({
          friendId: FRIEND_ID,
          occasion: 'birthday',
          answer: 'Coffee sampler is a good fit.',
          recommendations: [
            {
              title: 'Coffee sampler',
              reason: 'Coffee appeared in shared records.',
              confidence: 'medium',
            },
          ],
          sources: [
            {
              ownerUserId: FRIEND_ID,
              ownerNickname: 'gift friend',
              postId: FIRST_POST_ID,
              title: 'Coffee notes',
              sourceType: 'post',
              summary: 'Recently interested in coffee.',
            },
          ],
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByText('gift friend')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '선물 추천' }));

    expect(await screen.findByRole('heading', { name: '선물 추천' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('예산 최소'), { target: { value: '30000' } });
    fireEvent.change(screen.getByLabelText('예산 최대'), { target: { value: '70000' } });
    fireEvent.change(screen.getByLabelText('추가 선호'), { target: { value: 'coffee' } });
    fireEvent.click(screen.getByRole('button', { name: '추천 받기' }));

    expect(await screen.findByText('Coffee sampler is a good fit.')).toBeInTheDocument();
    expect(screen.getByText('Coffee sampler')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Coffee notes' })).toHaveAttribute(
      'href',
      `/app/posts/${FIRST_POST_ID}`,
    );
  });

  it('starts an agent run and shows approval-required state', async () => {
    const runId = '88888888-8888-8888-8888-888888888888';
    const approvalId = '99999999-9999-9999-9999-999999999999';
    window.history.pushState({}, '', '/app/agent');
    sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'access-token');
    let runCalls = 0;
    mockFetch(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) {
        return jsonResponse(authMeResponse());
      }
      if (url.endsWith('/agent-runs') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({
          goal: '주간 회고를 만들고 Notion에 저장',
          allowedTools: ['search_memories', 'summarize', 'notion_export'],
        });
        return jsonResponse(
          {
            id: runId,
            goal: '주간 회고를 만들고 Notion에 저장',
            status: 'pending',
            requiresApproval: false,
            result: null,
            pendingApprovals: [],
            failureReason: null,
            createdAt: '2026-06-17T03:10:00Z',
            updatedAt: '2026-06-17T03:10:00Z',
          },
          { status: 202 },
        );
      }
      if (url.endsWith(`/agent-runs/${runId}`)) {
        runCalls += 1;
        return jsonResponse({
          id: runId,
          goal: '주간 회고를 만들고 Notion에 저장',
          status: runCalls > 1 ? 'approval_required' : 'running',
          requiresApproval: runCalls > 1,
          result: null,
          pendingApprovals:
            runCalls > 1
              ? [
                  {
                    id: approvalId,
                    type: 'external_write',
                    description: 'Notion 페이지를 생성합니다.',
                    createdAt: '2026-06-17T03:10:10Z',
                  },
                ]
              : [],
          failureReason: null,
          createdAt: '2026-06-17T03:10:00Z',
          updatedAt: '2026-06-17T03:10:10Z',
        });
      }
      if (url.endsWith(`/agent-runs/${runId}/steps?page=0&size=20`)) {
        return jsonResponse({
          items: [
            {
              id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              stepOrder: 1,
              toolName: 'search_memories',
              status: 'succeeded',
              inputSummary: '최근 기억 검색',
              outputSummary: '관련 게시글 2개 발견',
              createdAt: '2026-06-17T03:10:05Z',
              updatedAt: '2026-06-17T03:10:05Z',
            },
          ],
          page: { page: 0, size: 20, totalCount: 1, totalPages: 1 },
        });
      }
      return jsonResponse({ detail: 'Not found' }, { status: 404 });
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Agent 실행' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Agent 목표'), {
      target: { value: '주간 회고를 만들고 Notion에 저장' },
    });
    fireEvent.click(screen.getByRole('button', { name: '실행 시작' }));

    expect(await screen.findByText('Notion 페이지를 생성합니다.')).toBeInTheDocument();
    expect(screen.getByText('search_memories')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '승인 화면으로' })).toHaveAttribute(
      'href',
      `/app/agent/approvals/${runId}`,
    );
  });
});
