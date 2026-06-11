// 📌 여행 코스 게시글 상세 화면. 본문, 작성자, 태그, 댓글을 보여준다.
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { deletePost, getPost, type TravelPostDetail } from './api'
import { useAuth } from './useAuth'

type DetailState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; post: TravelPostDetail }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function PostDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const [state, setState] = useState<DetailState>({ kind: 'loading' })
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!id) return

    let isMounted = true

    // URL의 게시글 id로 상세 정보를 조회한다.
    getPost(id)
      .then((post) => {
        if (isMounted) setState({ kind: 'ready', post })
      })
      .catch((error) => {
        if (!isMounted) return
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : '게시글을 불러오지 못했습니다.',
        })
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (!id) {
    return <Navigate to="/posts" replace />
  }

  const post = state.kind === 'ready' ? state.post : null
  const canEdit = Boolean(token && user && post && post.author.id === user.id)

  // 삭제 버튼 클릭 시 확인 후 백엔드 DELETE API를 호출한다.
  async function handleDelete() {
    if (!token || !post) return
    if (!window.confirm('이 여행 코스 게시글을 삭제할까요?')) return

    try {
      await deletePost(token, post.id)
      navigate('/posts')
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : '게시글 삭제에 실패했습니다.',
      )
    }
  }

  return (
    <main className="app-page">
      <section className="content-shell">
        <Link className="text-link" to="/posts">
          목록으로
        </Link>

        {state.kind === 'loading' && (
          <p className="status-text">게시글을 불러오는 중...</p>
        )}
        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}
        {post && (
          <article className="detail-panel">
            <header className="detail-header">
              <p className="post-location">
                {post.country} · {post.city}
              </p>
              <h1>{post.title}</h1>
              <p className="post-meta">
                작성자 {post.author.name} · {formatDate(post.createdAt)}
                {post.duration ? ` · ${post.duration}일 코스` : ''}
              </p>
              {post.tags.length > 0 && (
                <div className="tag-row">
                  {post.tags.map((tag) => (
                    <span className="tag-chip" key={tag.id}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <p className="detail-content">{post.content}</p>

            {canEdit && (
              <div className="action-row">
                <Link className="secondary-link-button" to={`/posts/${id}/edit`}>
                  수정
                </Link>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleDelete}
                >
                  삭제
                </button>
              </div>
            )}
            {deleteError && <p className="error-message">{deleteError}</p>}

            <section className="comment-section" aria-labelledby="comments-title">
              <h2 id="comments-title">댓글</h2>
              {post.comments.length === 0 && (
                <p className="status-text">아직 댓글이 없습니다.</p>
              )}
              {post.comments.map((comment) => (
                <article className="comment-item" key={comment.id}>
                  <strong>{comment.author.name}</strong>
                  <p>{comment.content}</p>
                </article>
              ))}
            </section>
          </article>
        )}
      </section>
    </main>
  )
}
