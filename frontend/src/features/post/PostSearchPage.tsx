import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listPosts, postQueryKeys } from '../../lib/api/posts';
import { PostCard } from './PostCard';
import { PostListSkeleton } from './PostFeedPage';
import { getErrorMessage, POST_PAGE_SIZE } from './utils';

export function PostSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keyword = (searchParams.get('q') ?? '').trim();
  const tag = (searchParams.get('tag') ?? '').trim();
  const page = parsePage(searchParams.get('page'));
  const [keywordInput, setKeywordInput] = useState(keyword);
  const [tagInput, setTagInput] = useState(tag);
  const hasSearch = keyword.length > 0 || tag.length > 0;

  useEffect(() => {
    setKeywordInput(keyword);
    setTagInput(tag);
  }, [keyword, tag]);

  const queryParams = useMemo(
    () => ({
      page,
      q: keyword,
      size: POST_PAGE_SIZE,
      tag,
    }),
    [keyword, page, tag],
  );
  const postsQuery = useQuery({
    enabled: hasSearch,
    queryFn: () => listPosts(queryParams),
    queryKey: postQueryKeys.list(queryParams),
  });

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(searchPath(keywordInput, tagInput, 0));
  }

  function movePage(nextPage: number) {
    navigate(searchPath(keyword, tag, nextPage));
  }

  const responsePage = postsQuery.data?.page;
  const totalCount = responsePage?.totalCount ?? 0;
  const totalPages = responsePage?.totalPages ?? 0;
  const canMovePrevious = page > 0;
  const canMoveNext = responsePage ? page + 1 < responsePage.totalPages : false;

  return (
    <section className="post-page" aria-labelledby="post-search-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Keyword Search</p>
          <h2 id="post-search-title">{keyword ? `Search results for "${keyword}"` : 'Search posts'}</h2>
        </div>
        <Link className="button button-primary" to="/app/posts/new">
          New post
          <span className="button-icon">
            <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
          </span>
        </Link>
      </div>

      <form className="search-bar search-bar-stacked" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="post-search-keyword">
          Search posts
        </label>
        <div className="search-input-shell">
          <Icon icon="solar:magnifer-linear" aria-hidden="true" />
          <input
            aria-label="Search posts"
            id="post-search-keyword"
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Search title, body, comments, or tags"
            type="search"
            value={keywordInput}
          />
        </div>
        <label className="sr-only" htmlFor="post-search-tag">
          Filter by tag
        </label>
        <div className="search-input-shell tag-filter-shell">
          <Icon icon="solar:hashtag-linear" aria-hidden="true" />
          <input
            aria-label="Filter by tag"
            id="post-search-tag"
            onChange={(event) => setTagInput(event.target.value)}
            placeholder="Filter by tag"
            type="search"
            value={tagInput}
          />
        </div>
        <button className="button button-secondary" type="submit">
          Search
        </button>
      </form>

      {!hasSearch ? (
        <div className="empty-state">
          <Icon icon="solar:magnifer-linear" aria-hidden="true" />
          <p className="empty-title">Start with a keyword or tag</p>
          <p className="empty-copy">Search checks your titles, body text, comments, and tags.</p>
        </div>
      ) : null}

      {postsQuery.isLoading ? <PostListSkeleton /> : null}

      {postsQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(postsQuery.error, 'Search failed.')}</p>
          <button className="button button-secondary" onClick={() => postsQuery.refetch()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      {postsQuery.data?.items.length === 0 ? (
        <div className="empty-state">
          <Icon icon="solar:magnifer-linear" aria-hidden="true" />
          <p className="empty-title">No matching posts</p>
          <p className="empty-copy">Try a different keyword or remove the tag filter.</p>
          <Link className="button button-secondary" to="/app/search">
            Clear search
          </Link>
        </div>
      ) : null}

      {postsQuery.data && postsQuery.data.items.length > 0 ? (
        <>
          <div className="search-summary" aria-live="polite">
            <span>{totalCount} results</span>
            <span>
              Page {page + 1} of {Math.max(totalPages, 1)}
            </span>
          </div>
          <div className="post-grid" aria-label="Search result posts">
            {postsQuery.data.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="pagination-controls">
            <button
              aria-label="Previous page"
              className="button button-secondary"
              disabled={!canMovePrevious}
              onClick={() => movePage(page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              aria-label="Next page"
              className="button button-secondary"
              disabled={!canMoveNext}
              onClick={() => movePage(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

function parsePage(value: string | null): number {
  const parsed = Number(value ?? '0');
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function searchPath(keyword: string, tag: string, page: number): string {
  const params = new URLSearchParams();
  const cleanKeyword = keyword.trim();
  const cleanTag = tag.trim();

  if (cleanKeyword) {
    params.set('q', cleanKeyword);
  }
  if (cleanTag) {
    params.set('tag', cleanTag);
  }
  if (page > 0) {
    params.set('page', String(page));
  }

  const query = params.toString();
  return query ? `/app/search?${query}` : '/app/search';
}
