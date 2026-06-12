// 📌 마이페이지. 로그인한 사용자가 저장("나중에 보기")한 여행 코스 목록을 보여준다.
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getSavedPosts, type TravelPost } from './api'
import { useAuth } from './useAuth'

type SavedState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; posts: TravelPost[] }

export function MyPage() {
  const { token, user } = useAuth()
  const [state, setState] = useState<SavedState>({ kind: 'loading' })

  useEffect(() => {
    if (!token) return

    let isMounted = true

    // 내가 저장한 게시글 목록을 최근 저장 순으로 불러온다.
    getSavedPosts(token)
      .then((posts) => {
        if (isMounted) setState({ kind: 'ready', posts })
      })
      .catch((error) => {
        if (!isMounted) return
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : '저장한 코스를 불러오지 못했습니다.',
        })
      })

    return () => {
      isMounted = false
    }
  }, [token])

  // 로그인하지 않은 사용자는 로그인 화면으로 보낸다.
  if (!token) {
    return <Navigate to="/login" replace />
  }

  const savedCount = state.kind === 'ready' ? state.posts.length : 0

  return (
    <main className="app-page">
      <section className="content-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">마이페이지</p>
            <h1>{user ? `${user.name}님의 저장한 코스` : '저장한 코스'}</h1>
            <p className="dashboard-copy">
              나중에 다시 보고 싶은 여행 코스를 모아두는 공간이에요.
              {state.kind === 'ready' && ` 현재 ${savedCount}개를 저장했어요.`}
            </p>
          </div>
        </header>

        {state.kind === 'loading' && (
          <p className="status-text">저장한 코스를 불러오는 중...</p>
        )}
        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}
        {state.kind === 'ready' && (
          <>
            {state.posts.length === 0 ? (
              <p className="status-text">
                아직 저장한 코스가 없어요.{' '}
                <Link to="/posts">게시판</Link>에서 마음에 드는 코스를 저장해
                보세요.
              </p>
            ) : (
              <div className="post-grid">
                {state.posts.map((post) => (
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
            )}
          </>
        )}
      </section>
    </main>
  )
}
