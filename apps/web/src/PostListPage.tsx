// 📌 여행 코스 게시글 목록 화면. 페이지네이션된 게시글 카드를 보여준다.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPosts, type PaginatedPosts } from './api'
import { useAuth } from './useAuth'

const PAGE_SIZE = 10

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; data: PaginatedPosts }

export function PostListPage() {
  const { token } = useAuth()
  const [page, setPage] = useState(1)
  const [state, setState] = useState<ListState>({ kind: 'loading' })

  useEffect(() => {
    let isMounted = true

    // 현재 page에 해당하는 게시글 목록을 백엔드에서 가져온다.
    getPosts(page, PAGE_SIZE)
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
  }, [page])

  const totalPages =
    state.kind === 'ready'
      ? Math.max(1, Math.ceil(state.data.total / state.data.limit))
      : 1

  return (
    <main className="app-page">
      <section className="content-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">여행 코스 게시판</p>
            <h1>숨겨진 여행 코스</h1>
            <p className="dashboard-copy">
              직접 다녀온 도시별 코스를 공유하고 다음 여행 아이디어를 찾아보세요.
            </p>
          </div>
          {token && (
            <Link className="primary-link-button" to="/posts/new">
              새 코스 작성
            </Link>
          )}
        </header>

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
                    <p className="post-location">
                      {post.country} · {post.city}
                    </p>
                    <h2>{post.title}</h2>
                    <p className="post-meta">
                      작성자 {post.author.name}
                      {post.duration ? ` · ${post.duration}일 코스` : ''}
                    </p>
                    <p className="post-excerpt">{post.content}</p>
                  </Link>
                </article>
              ))}
            </div>

            {state.data.items.length === 0 && (
              <p className="status-text">아직 등록된 여행 코스가 없습니다.</p>
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
