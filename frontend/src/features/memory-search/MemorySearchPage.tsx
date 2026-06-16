import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage, formatDate } from '../post/utils';
import { memoryQueryKeys, searchMemories } from '../../lib/api/memory';

export function MemorySearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const [queryInput, setQueryInput] = useState(query);
  const hasQuery = query.length > 0;

  useEffect(() => {
    setQueryInput(query);
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

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(memorySearchPath(queryInput));
  }

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

function memorySearchPath(queryValue: string): string {
  const trimmed = queryValue.trim();
  return trimmed ? `/app/memory-search?q=${encodeURIComponent(trimmed)}` : '/app/memory-search';
}
