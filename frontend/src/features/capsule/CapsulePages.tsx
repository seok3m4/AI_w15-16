import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  capsuleQueryKeys,
  createCapsule,
  deleteCapsule,
  getCapsule,
  getCompactContext,
  listCapsules,
  updateCapsule,
} from '../../lib/api/capsules';
import { ContextCapsuleCompactContextResponse, ContextCapsuleResponse } from '../../lib/api/types';
import { getErrorMessage, formatDate, isNotFound } from '../post/utils';
import { PostListSkeleton } from '../post/PostFeedPage';

const CAPSULE_PAGE_SIZE = 20;

export function CapsuleListPage() {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const capsulesQuery = useQuery({
    queryFn: () => listCapsules({ page, size: CAPSULE_PAGE_SIZE }),
    queryKey: capsuleQueryKeys.list({ page, size: CAPSULE_PAGE_SIZE }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCapsule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: capsuleQueryKeys.all });
    },
  });
  const responsePage = capsulesQuery.data?.page;
  const canMovePrevious = page > 0;
  const canMoveNext = responsePage ? page + 1 < responsePage.totalPages : false;

  return (
    <section className="post-page" aria-labelledby="capsule-list-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Context Capsule</p>
          <h2 id="capsule-list-title">컨텍스트 캡슐</h2>
        </div>
        <Link className="button button-primary" to="/app/capsules/new">
          새 캡슐 만들기
          <span className="button-icon">
            <Icon icon="solar:box-minimalistic-linear" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {capsulesQuery.isLoading ? <PostListSkeleton /> : null}

      {capsulesQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(capsulesQuery.error, '캡슐 목록을 불러오지 못했습니다.')}</p>
          <button
            className="button button-secondary"
            onClick={() => capsulesQuery.refetch()}
            type="button"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {deleteMutation.isError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(deleteMutation.error, '캡슐을 삭제하지 못했습니다.')}
        </p>
      ) : null}

      {capsulesQuery.data?.items.length === 0 ? (
        <div className="empty-state">
          <Icon icon="solar:box-minimalistic-linear" aria-hidden="true" />
          <p className="empty-title">캡슐이 없어요</p>
          <p className="empty-copy">목적과 기억 근거를 묶어 외부 LLM에 건넬 맥락을 만들어보세요.</p>
          <Link className="button button-primary" to="/app/capsules/new">
            새 캡슐 만들기
            <span className="button-icon">
              <Icon icon="solar:add-circle-linear" aria-hidden="true" />
            </span>
          </Link>
        </div>
      ) : null}

      {capsulesQuery.data && capsulesQuery.data.items.length > 0 ? (
        <>
          <div className="post-grid" aria-label="Capsule list">
            {capsulesQuery.data.items.map((capsule) => (
              <article className="post-card capsule-card" key={capsule.id}>
                <div className="post-card-meta">
                  <span>Updated {formatDate(capsule.updatedAt)}</span>
                  {capsule.containsFriendContext ? (
                    <span className="memory-badge danger">친구 데이터 포함</span>
                  ) : (
                    <span className="memory-badge success">내 기억</span>
                  )}
                </div>
                <Link className="post-card-title" to={`/app/capsules/${capsule.id}`}>
                  {capsule.title}
                </Link>
                <p>{capsule.purpose}</p>
                <div className="post-card-actions">
                  <Link className="button button-secondary" to={`/app/capsules/${capsule.id}`}>
                    상세
                  </Link>
                  <button
                    className="button button-danger"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(capsule.id)}
                    type="button"
                  >
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="pagination-controls">
            <button
              aria-label="Previous capsule page"
              className="button button-secondary"
              disabled={!canMovePrevious}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
              type="button"
            >
              이전
            </button>
            <span className="pagination-status">
              Page {page + 1} of {Math.max(responsePage?.totalPages ?? 0, 1)}
            </span>
            <button
              aria-label="Next capsule page"
              className="button button-secondary"
              disabled={!canMoveNext}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              다음
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

export function CapsuleCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [query, setQuery] = useState('');
  const [sourcePostIds, setSourcePostIds] = useState('');
  const [clientError, setClientError] = useState('');
  const createMutation = useMutation({
    mutationFn: createCapsule,
    onSuccess: async (capsule) => {
      await queryClient.invalidateQueries({ queryKey: capsuleQueryKeys.all });
      navigate(`/app/capsules/${capsule.id}`);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();
    const normalizedPurpose = purpose.trim();
    const normalizedQuery = query.trim();
    const normalizedSourcePostIds = parseSourcePostIds(sourcePostIds);

    if (!normalizedTitle || !normalizedPurpose) {
      setClientError('제목과 목적을 입력해 주세요.');
      return;
    }
    if (!normalizedQuery && normalizedSourcePostIds.length === 0) {
      setClientError('쿼리 또는 근거 게시물 UUID를 하나 이상 입력해 주세요.');
      return;
    }

    setClientError('');
    createMutation.mutate({
      title: normalizedTitle,
      purpose: normalizedPurpose,
      query: normalizedQuery || null,
      scope: 'me',
      sourcePostIds: normalizedSourcePostIds.length > 0 ? normalizedSourcePostIds : null,
    });
  }

  return (
    <section className="post-page" aria-labelledby="capsule-create-title">
      <CapsuleToolbar title="새 컨텍스트 캡슐" />

      <form className="post-form capsule-form" onSubmit={submit}>
        <label htmlFor="capsule-title">제목</label>
        <input
          id="capsule-title"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="내 프로젝트 맥락"
          value={title}
        />

        <label htmlFor="capsule-purpose">목적</label>
        <textarea
          id="capsule-purpose"
          onChange={(event) => setPurpose(event.target.value)}
          placeholder="외부 LLM에게 최근 프로젝트 맥락 전달"
          rows={4}
          value={purpose}
        />

        <label htmlFor="capsule-query">Memory Search 쿼리</label>
        <input
          id="capsule-query"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="최근 프로젝트 결정사항"
          value={query}
        />

        <label htmlFor="capsule-source-post-ids">근거 게시물 UUID</label>
        <textarea
          id="capsule-source-post-ids"
          onChange={(event) => setSourcePostIds(event.target.value)}
          placeholder="쉼표 또는 줄바꿈으로 구분"
          rows={3}
          value={sourcePostIds}
        />

        {clientError ? (
          <p className="alert alert-error" role="alert">
            {clientError}
          </p>
        ) : null}
        {createMutation.isError ? (
          <p className="alert alert-error" role="alert">
            {getErrorMessage(createMutation.error, '캡슐을 생성하지 못했습니다.')}
          </p>
        ) : null}

        <div className="form-actions">
          <Link className="button button-secondary" to="/app/capsules">
            취소
          </Link>
          <button className="button button-primary" disabled={createMutation.isPending} type="submit">
            생성
          </button>
        </div>
      </form>
    </section>
  );
}

export function CapsuleDetailPage() {
  const { capsuleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const detailQuery = useQuery({
    enabled: Boolean(capsuleId),
    queryFn: () => getCapsule(capsuleId ?? ''),
    queryKey: capsuleQueryKeys.detail(capsuleId ?? ''),
  });
  const compactQuery = useQuery({
    enabled: Boolean(capsuleId),
    queryFn: () => getCompactContext(capsuleId ?? ''),
    queryKey: capsuleQueryKeys.compact(capsuleId ?? ''),
  });
  const updateMutation = useMutation({
    mutationFn: ({ title, purpose }: { title: string; purpose: string }) =>
      updateCapsule(capsuleId ?? '', { title, purpose }),
    onSuccess: async (capsule) => {
      queryClient.setQueryData(capsuleQueryKeys.detail(capsule.id), capsule);
      await queryClient.invalidateQueries({ queryKey: capsuleQueryKeys.all });
      setIsEditing(false);
      setMessage('캡슐을 수정했습니다.');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteCapsule(capsuleId ?? ''),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: capsuleQueryKeys.all });
      navigate('/app/capsules');
    },
  });

  if (detailQuery.isLoading) {
    return (
      <section className="post-page" aria-labelledby="capsule-detail-title">
        <CapsuleToolbar title="Context Capsule" />
        <PostListSkeleton />
      </section>
    );
  }

  if (detailQuery.isError) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <section className="post-page" aria-labelledby="capsule-detail-title">
        <CapsuleToolbar title="Context Capsule" />
        <div className="state-panel" role="alert">
          <Icon icon={notFound ? 'solar:box-minimalistic-linear' : 'solar:danger-circle-linear'} aria-hidden="true" />
          <p>
            {notFound
              ? '찾을 수 없는 캡슐입니다.'
              : getErrorMessage(detailQuery.error, '캡슐을 불러오지 못했습니다.')}
          </p>
          <Link className="button button-secondary" to="/app/capsules">
            목록으로
          </Link>
        </div>
      </section>
    );
  }

  const capsule = detailQuery.data;
  if (!capsule) {
    return null;
  }

  return (
    <section className="post-page" aria-labelledby="capsule-detail-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Context Capsule</p>
          <h2 id="capsule-detail-title">{capsule.title}</h2>
        </div>
        <div className="form-actions">
          <button
            className="button button-secondary"
            onClick={() => setIsEditing((current) => !current)}
            type="button"
          >
            {isEditing ? '수정 취소' : '수정'}
          </button>
          <button
            className="button button-danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            type="button"
          >
            삭제
          </button>
        </div>
      </div>

      {message ? <p className="alert alert-success">{message}</p> : null}
      {deleteMutation.isError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(deleteMutation.error, '캡슐을 삭제하지 못했습니다.')}
        </p>
      ) : null}

      {isEditing ? (
        <CapsuleEditForm
          capsule={capsule}
          error={updateMutation.error}
          isPending={updateMutation.isPending}
          onSubmit={(title, purpose) => updateMutation.mutate({ title, purpose })}
        />
      ) : (
        <CapsuleDetail capsule={capsule} />
      )}

      <CompactContextBlock
        compact={compactQuery.data}
        error={compactQuery.error}
        isError={compactQuery.isError}
        isLoading={compactQuery.isLoading}
        onRetry={() => compactQuery.refetch()}
      />
    </section>
  );
}

function CapsuleToolbar({ title }: { title: string }) {
  return (
    <div className="page-toolbar">
      <div>
        <p className="eyebrow">Context Capsule</p>
        <h2 id="capsule-create-title">{title}</h2>
      </div>
      <Link className="button button-secondary" to="/app/capsules">
        목록으로
      </Link>
    </div>
  );
}

function CapsuleDetail({ capsule }: { capsule: ContextCapsuleResponse }) {
  return (
    <article className="capsule-detail">
      <div className="capsule-meta">
        {capsule.containsFriendContext ? (
          <span className="memory-badge danger">친구 데이터 포함</span>
        ) : (
          <span className="memory-badge success">내 기억</span>
        )}
        <time dateTime={capsule.updatedAt}>Updated {formatDate(capsule.updatedAt)}</time>
      </div>
      <p className="capsule-purpose">{capsule.purpose}</p>
      <section className="capsule-section" aria-labelledby="capsule-summary-heading">
        <h3 id="capsule-summary-heading">요약</h3>
        <p>{capsule.summary}</p>
      </section>
      <section className="capsule-section" aria-labelledby="capsule-facts-heading">
        <h3 id="capsule-facts-heading">핵심 사실</h3>
        <ul className="capsule-list">
          {capsule.keyFacts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </section>
      <section className="capsule-section" aria-labelledby="capsule-tags-heading">
        <h3 id="capsule-tags-heading">태그</h3>
        <div className="tag-row">
          {capsule.tags.map((tag) => (
            <span className="tag-chip" key={tag}>
              #{tag}
            </span>
          ))}
        </div>
      </section>
      <section className="capsule-section" aria-labelledby="capsule-sources-heading">
        <h3 id="capsule-sources-heading">출처</h3>
        <div className="capsule-source-list">
          {capsule.sources.map((source) => (
            <Link className="capsule-source" key={`${source.postId}-${source.chunkId}`} to={`/app/posts/${source.postId}`}>
              <span>{source.title}</span>
              <small>{source.ownerNickname} · {source.sourceType}</small>
              <p>{source.snippet}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}

type CapsuleEditFormProps = {
  capsule: ContextCapsuleResponse;
  error: unknown;
  isPending: boolean;
  onSubmit: (title: string, purpose: string) => void;
};

function CapsuleEditForm({ capsule, error, isPending, onSubmit }: CapsuleEditFormProps) {
  const [title, setTitle] = useState(capsule.title);
  const [purpose, setPurpose] = useState(capsule.purpose);

  useEffect(() => {
    setTitle(capsule.title);
    setPurpose(capsule.purpose);
  }, [capsule]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(title.trim(), purpose.trim());
  }

  return (
    <form className="post-form capsule-form" onSubmit={submit}>
      <label htmlFor="capsule-edit-title">제목</label>
      <input
        id="capsule-edit-title"
        onChange={(event) => setTitle(event.target.value)}
        value={title}
      />
      <label htmlFor="capsule-edit-purpose">목적</label>
      <textarea
        id="capsule-edit-purpose"
        onChange={(event) => setPurpose(event.target.value)}
        rows={4}
        value={purpose}
      />
      {error ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(error, '캡슐을 수정하지 못했습니다.')}
        </p>
      ) : null}
      <div className="form-actions">
        <button className="button button-primary" disabled={isPending} type="submit">
          수정 저장
        </button>
      </div>
    </form>
  );
}

type CompactContextBlockProps = {
  compact: ContextCapsuleCompactContextResponse | undefined;
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
};

function CompactContextBlock({
  compact,
  error,
  isError,
  isLoading,
  onRetry,
}: CompactContextBlockProps) {
  const [copyMessage, setCopyMessage] = useState('');
  const json = useMemo(() => (compact ? JSON.stringify(compact, null, 2) : ''), [compact]);

  async function copyCompactContext() {
    if (!json) {
      return;
    }
    await navigator.clipboard.writeText(json);
    setCopyMessage('compact JSON을 복사했습니다.');
  }

  return (
    <section className="capsule-section compact-context" aria-labelledby="compact-context-heading">
      <div className="compact-context-heading">
        <h3 id="compact-context-heading">compact JSON</h3>
        <button
          className="button button-secondary"
          disabled={!compact}
          onClick={copyCompactContext}
          type="button"
        >
          복사
        </button>
      </div>
      {isLoading ? <p className="comment-state">compact context를 불러오고 있습니다.</p> : null}
      {isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(error, 'compact context를 불러오지 못했습니다.')}</p>
          <button className="button button-secondary" onClick={onRetry} type="button">
            다시 시도
          </button>
        </div>
      ) : null}
      {compact ? <pre>{json}</pre> : null}
      {copyMessage ? <p className="alert alert-success">{copyMessage}</p> : null}
    </section>
  );
}

function parseSourcePostIds(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
