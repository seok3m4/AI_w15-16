// 📌 여행 코스 게시글 목록 화면. 검색/태그 필터와 페이지네이션된 카드를 보여준다.
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getPosts, type PaginatedPosts } from './api'
import { useAuth } from './useAuth'

const PAGE_SIZE = 10

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: PaginatedPosts }

// 실제 API 호출에 적용되는 확정된 검색 조건.
type SearchQuery = {
  q: string
  tag: string
}

const emptyQuery: SearchQuery = { q: '', tag: '' }

export function PostListPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [state, setState] = useState<ListState>({ kind: 'loading' })
  // 입력 중인 값과 실제 적용된 검색 조건을 분리해 매 타이핑마다 호출하지 않는다.
  const [inputs, setInputs] = useState<SearchQuery>(emptyQuery)
  const [query, setQuery] = useState<SearchQuery>(emptyQuery)

  useEffect(() => {
    let isMounted = true
    setState({ kind: 'loading' })

    // 현재 page와 검색 조건에 해당하는 게시글 목록을 백엔드에서 가져온다.
    getPosts(page, PAGE_SIZE, { q: query.q, tag: query.tag }, token)
      .then((data) => {
        if (isMounted) setState({ kind: 'ready', data })
      })
      .catch((error) => {
        if (!isMounted) return
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : '게시글 목록을 불러오지 못했습니다.',
        })
      })

    return () => {
      isMounted = false
    }
  }, [page, query, token])

  const totalPages =
    state.kind === 'ready'
      ? Math.max(1, Math.ceil(state.data.total / state.data.limit))
      : 1

  const isFiltered = Boolean(query.q || query.tag)

  // 검색 폼 제출 시 입력값을 확정 조건으로 옮기고 첫 페이지로 이동한다.
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setQuery({ q: inputs.q.trim(), tag: inputs.tag.trim() })
  }

  // 검색 조건을 모두 비우고 전체 목록으로 돌아간다.
  function handleReset() {
    setInputs(emptyQuery)
    setQuery(emptyQuery)
    setPage(1)
  }

  return (
    <main className="app-page">
      <section className="content-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">여행 코스 게시판</p>
            <h1>정글 여행</h1>
            <p className="dashboard-copy">
              직접 다녀온 국내 도시별 코스를 공유하고 다음 여행 아이디어를
              찾아보세요.
            </p>
          </div>
          {token && (
            <Link className="primary-link-button" to="/posts/new">
              새 코스 작성
            </Link>
          )}
        </header>

        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="search"
            value={inputs.q}
            onChange={(event) =>
              setInputs((current) => ({ ...current, q: event.target.value }))
            }
            placeholder="제목·본문 검색"
            aria-label="제목 본문 검색"
          />
          <input
            type="search"
            value={inputs.tag}
            onChange={(event) =>
              setInputs((current) => ({ ...current, tag: event.target.value }))
            }
            placeholder="태그"
            aria-label="태그 필터"
          />
          <button type="submit" className="primary-link-button">
            검색
          </button>
          {isFiltered && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleReset}
            >
              초기화
            </button>
          )}
        </form>

        {state.kind === 'loading' && (
          <p className="status-text">게시글을 불러오는 중...</p>
        )}
        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}
        {state.kind === 'ready' && (
          <>
            <div className="post-grid">
              {state.data.items.map((post) => (
                <article className="post-card" key={post.id}>
                  <Link to={`/posts/${post.id}`}>
                    <p className="post-location">{post.city}</p>
                    <h2>{post.title}</h2>
                    <p className="post-meta">
                      작성자 {post.author.name}
                      {post.duration ? ` · ${post.duration}일 코스` : ''}
                      {post.saveCount > 0 && (
                        <span className="post-save-count">
                          {' '}
                          · 🔖 {post.saveCount}
                        </span>
                      )}
                    </p>
                    <p className="post-excerpt">{post.content}</p>
                    {post.tags.length > 0 && (
                      <div className="tag-row">
                        {post.tags.map((tag) => (
                          <span className="tag-chip" key={tag.id}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </article>
              ))}
            </div>

            {state.data.items.length === 0 && (
              <p className="status-text">
                {isFiltered
                  ? '검색 조건에 맞는 여행 코스가 없습니다.'
                  : '아직 등록된 여행 코스가 없습니다.'}
              </p>
            )}

            <div className="pagination">
              <button
                type="button"
                className="secondary-button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                이전
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="secondary-button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                다음
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
