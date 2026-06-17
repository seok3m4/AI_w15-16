import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage, formatDate } from '../post/utils';
import { getJob, memoryQueryKeys, searchMemories, summarizeMemorySearch } from '../../lib/api/memory';
import { AsyncJobResponse, MemorySummaryResponse } from '../../lib/api/types';

const SUMMARY_SOURCE_LIMIT = 5;

export function MemorySearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const [queryInput, setQueryInput] = useState(query);
  const [summary, setSummary] = useState<MemorySummaryResponse | null>(null);
  const [summaryJobId, setSummaryJobId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const hasQuery = query.length > 0;

  useEffect(() => {
    setQueryInput(query);
    setSummary(null);
    setSummaryJobId(null);
    setSummaryError(null);
  }, [query]);

  const request = useMemo(
    () => ({
      query,
      scope: 'me',
    }),
    [query],
  );
  const searchQuery = useQuery({
    enabled: hasQuery,
    queryFn: () => searchMemories(request),
    queryKey: memoryQueryKeys.search(query),
  });
  const hasNoResults = searchQuery.data && searchQuery.data.results.length === 0;
  const sourcePostIds = useMemo(
    () =>
      Array.from(new Set(searchQuery.data?.results.map((result) => result.postId) ?? [])).slice(
        0,
        SUMMARY_SOURCE_LIMIT,
      ),
    [searchQuery.data?.results],
  );
  const summaryMutation = useMutation({
    mutationFn: () =>
      summarizeMemorySearch({
        maxSources: SUMMARY_SOURCE_LIMIT,
        query,
        scope: 'me',
        sourcePostIds,
      }),
    onMutate: () => {
      setSummary(null);
      setSummaryJobId(null);
      setSummaryError(null);
    },
    onSuccess: (response) => {
      if (isMemorySummaryResponse(response)) {
        setSummary(response);
        return;
      }
      if (isMemorySummaryJob(response)) {
        setSummaryJobId(response.id);
        return;
      }
      setSummaryError('검색 결과는 있지만 요약을 생성하지 못했어요');
    },
    onError: (error) => {
      setSummaryError(getErrorMessage(error, '검색 결과는 있지만 요약을 생성하지 못했어요'));
    },
  });
  const summaryJobQuery = useQuery({
    enabled: summaryJobId !== null && summary === null && summaryError === null,
    queryFn: () => getJob(summaryJobId ?? ''),
    queryKey: summaryJobId ? memoryQueryKeys.job(summaryJobId) : memoryQueryKeys.job(''),
    refetchInterval: (queryState) => {
      const data = queryState.state.data;
      return data && ['succeeded', 'failed'].includes(data.status) ? false : 300;
    },
  });

  useEffect(() => {
    const job = summaryJobQuery.data;
    if (!job) {
      return;
    }
    if (job.status === 'succeeded') {
      if (isMemorySummaryResponse(job.result)) {
        setSummary(job.result);
        setSummaryJobId(null);
      } else {
        setSummaryError('검색 결과는 있지만 요약을 생성하지 못했어요');
      }
    }
    if (job.status === 'failed') {
      setSummaryError('검색 결과는 있지만 요약을 생성하지 못했어요');
    }
  }, [summaryJobQuery.data]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(memorySearchPath(queryInput));
  }

  function requestSummary() {
    if (query && sourcePostIds.length > 0) {
      summaryMutation.mutate();
    }
  }

  const isSummaryLoading =
    summaryMutation.isPending ||
    (summaryJobId !== null &&
      summary === null &&
      summaryError === null &&
      summaryJobQuery.data?.status !== 'failed');

  return (
    <section className="post-page" aria-labelledby="memory-search-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Memory Search</p>
          <h2 id="memory-search-title">Search your memory</h2>
        </div>
        <Link className="button button-primary" to="/app/posts/new">
          New post
          <span className="button-icon">
            <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
          </span>
        </Link>
      </div>

      <form className="search-bar search-bar-stacked" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="memory-search-query">
          Search memory
        </label>
        <div className="search-input-shell">
          <Icon icon="solar:magic-stars-linear" aria-hidden="true" />
          <input
            aria-label="Search memory"
            id="memory-search-query"
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Search through your memory chunks"
            type="search"
            value={queryInput}
          />
        </div>
        <button className="button button-secondary" type="submit">
          Search
        </button>
      </form>

      {!hasQuery ? (
        <div className="empty-state">
          <Icon icon="solar:magic-stars-linear" aria-hidden="true" />
          <p className="empty-title">Start with a natural-language query</p>
          <p className="empty-copy">Search your own posts, tags, and comments by meaning.</p>
        </div>
      ) : null}

      {searchQuery.isLoading ? <div className="empty-state">Searching your memory...</div> : null}

      {searchQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(searchQuery.error, 'Memory search failed.')}</p>
          <button
            className="button button-secondary"
            onClick={() => searchQuery.refetch()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : null}

      {hasNoResults ? (
        <div className="empty-state">
          <Icon icon="solar:magnifer-linear" aria-hidden="true" />
          <p className="empty-title">No memory matches yet</p>
          <p className="empty-copy">Try a broader query, or search keywords in a related phrase.</p>
          <Link className="button button-secondary" to={`/app/search?q=${encodeURIComponent(query)}`}>
            Search as keyword instead
          </Link>
        </div>
      ) : null}

      {searchQuery.data && searchQuery.data.results.length > 0 ? (
        <>
          <section className="ai-summary-panel" aria-labelledby="ai-summary-title">
            <div className="ai-summary-heading">
              <div>
                <p className="eyebrow">AI 요약</p>
                <h3 id="ai-summary-title">검색 결과 요약</h3>
              </div>
              <button
                className="button button-secondary"
                disabled={isSummaryLoading}
                onClick={requestSummary}
                type="button"
              >
                {isSummaryLoading ? '요약 중...' : 'AI 요약 보기'}
              </button>
            </div>

            {isSummaryLoading ? (
              <div className="summary-loading" role="status">
                <Icon className="breathe" icon="solar:magic-stars-bold" aria-hidden="true" />
                <span>기억에서 찾는 중...</span>
              </div>
            ) : null}

            {summaryJobId ? (
              <p className="memory-job-status">Memory summary job: {summaryJobId}</p>
            ) : null}

            {summaryError ? (
              <div className="state-panel compact" role="alert">
                <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
                <p>검색 결과는 있지만 요약을 생성하지 못했어요</p>
              </div>
            ) : null}

            {summary ? <MemorySummaryBlock summary={summary} /> : null}
          </section>

          <div className="search-summary" aria-live="polite">
            <span>
              {searchQuery.data.results.length} result{searchQuery.data.results.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="memory-result-list" aria-label="Memory search results">
            {searchQuery.data.results.map((result) => (
              <li className="memory-result-item" key={`${result.postId}-${result.chunkId}`}>
                <Link
                  className="memory-result-title"
                  to={`/app/posts/${result.postId}`}
                  title={`Open ${result.title}`}
                >
                  {result.title}
                </Link>
                <div className="memory-result-meta">
                  <span>{result.ownerNickname}</span>
                  <span>{result.sourceType}</span>
                  <span>score {result.score.toFixed(3)}</span>
                  <time dateTime={result.createdAt}>{formatDate(result.createdAt)}</time>
                </div>
                <p className="memory-result-snippet">{result.snippet}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function MemorySummaryBlock({ summary }: { summary: MemorySummaryResponse }) {
  return (
    <div className="ai-summary-answer">
      <p>{summary.answer}</p>
      <ul className="citation-list" aria-label="AI summary citations">
        {summary.sources.map((source) => (
          <li key={`${source.postId}-${source.sourceType}`}>
            <Link className="citation-link" to={`/app/posts/${source.postId}`}>
              <Icon icon="solar:document-text-linear" aria-hidden="true" />
              <span>{source.title}</span>
            </Link>
            <p>{source.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function isMemorySummaryJob(value: unknown): value is AsyncJobResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<AsyncJobResponse>;
  return candidate.type === 'memory_summarize' && typeof candidate.id === 'string';
}

function isMemorySummaryResponse(value: unknown): value is MemorySummaryResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<MemorySummaryResponse>;
  return (
    typeof candidate.query === 'string' &&
    typeof candidate.answer === 'string' &&
    Array.isArray(candidate.sources)
  );
}

function memorySearchPath(queryValue: string): string {
  const trimmed = queryValue.trim();
  return trimmed ? `/app/memory-search?q=${encodeURIComponent(trimmed)}` : '/app/memory-search';
}
