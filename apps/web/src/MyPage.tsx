// 📌 마이페이지. 로그인한 사용자가 작성한 코스와 저장한 코스를 탭으로 나눠 보여준다.
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getMyPosts, getSavedPosts, type TravelPost } from './api'
import { useAuth } from './useAuth'

type MyPageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; authoredPosts: TravelPost[]; savedPosts: TravelPost[] }

type MyPageTab = 'authored' | 'saved'

function PostCard({ post }: { post: TravelPost }) {
  return (
    <article className="post-card">
      <Link to={`/posts/${post.id}`}>
        {post.thumbnailUrl ? (
          <div className="post-card-thumb">
            <img src={post.thumbnailUrl} alt="" loading="lazy" />
          </div>
        ) : (
          <div className="post-card-thumb placeholder">
            <span>{post.city}</span>
          </div>
        )}
        <div className="post-card-body">
          <p className="post-location">{post.city}</p>
          <h2>{post.title}</h2>
          <p className="post-meta">
            작성자 {post.author.name}
            {post.duration ? ` · ${post.duration}일 코스` : ''}
            {post.saveCount > 0 && (
              <span className="post-save-count"> · 🔖 {post.saveCount}</span>
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
        </div>
      </Link>
    </article>
  )
}

function PostGrid({
  posts,
  emptyMessage,
}: {
  posts: TravelPost[]
  emptyMessage: ReactNode
}) {
  if (posts.length === 0) {
    return <p className="status-text">{emptyMessage}</p>
  }

  return (
    <div className="post-grid">
      {posts.map((post) => (
        <PostCard post={post} key={post.id} />
      ))}
    </div>
  )
}

export function MyPage() {
  const { token, user } = useAuth()
  const [activeTab, setActiveTab] = useState<MyPageTab>('authored')
  const [state, setState] = useState<MyPageState>({ kind: 'loading' })

  useEffect(() => {
    if (!token) return

    let isMounted = true

    // 마이페이지에 필요한 두 목록을 한 번에 불러온다.
    Promise.all([getMyPosts(token), getSavedPosts(token)])
      .then(([authoredPosts, savedPosts]) => {
        if (isMounted) {
          setState({ kind: 'ready', authoredPosts, savedPosts })
        }
      })
      .catch((error) => {
        if (!isMounted) return
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : '마이페이지 정보를 불러오지 못했습니다.',
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

  const authoredCount = state.kind === 'ready' ? state.authoredPosts.length : 0
  const savedCount = state.kind === 'ready' ? state.savedPosts.length : 0

  return (
    <main className="app-page">
      <section className="content-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">마이페이지</p>
            <h1>{user ? `${user.name}님의 여행 코스` : '내 여행 코스'}</h1>
            <p className="dashboard-copy">
              내가 직접 작성한 코스와 나중에 다시 볼 코스를 분리해서 관리해요.
            </p>
          </div>
        </header>

        <div className="my-page-tabs" role="tablist" aria-label="마이페이지 목록">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'authored'}
            className={activeTab === 'authored' ? 'active' : ''}
            onClick={() => setActiveTab('authored')}
          >
            내가 작성한 코스 {authoredCount}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'saved'}
            className={activeTab === 'saved' ? 'active' : ''}
            onClick={() => setActiveTab('saved')}
          >
            저장한 코스 {savedCount}
          </button>
        </div>

        {state.kind === 'loading' && (
          <p className="status-text">마이페이지 정보를 불러오는 중...</p>
        )}
        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}
        {state.kind === 'ready' && activeTab === 'authored' && (
          <PostGrid
            posts={state.authoredPosts}
            emptyMessage={
              <>
                아직 작성한 코스가 없어요.{' '}
                <Link to="/posts/new">새 코스 작성</Link>에서 첫 코스를 공유해
                보세요.
              </>
            }
          />
        )}
        {state.kind === 'ready' && activeTab === 'saved' && (
          <PostGrid
            posts={state.savedPosts}
            emptyMessage={
              <>
                아직 저장한 코스가 없어요. <Link to="/posts">게시판</Link>에서
                마음에 드는 코스를 저장해 보세요.
              </>
            }
          />
        )}
      </section>
    </main>
  )
}
