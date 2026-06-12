// 📌 여행 코스 게시글 상세 화면. 본문, 작성자, 태그, 댓글 작성/삭제를 보여준다.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  createComment,
  deleteComment,
  deletePost,
  getPost,
  type TravelPostDetail,
} from './api'
import { CourseMap } from './CourseMap'
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
  const [commentInput, setCommentInput] = useState('')
  const [commentError, setCommentError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  // 댓글 작성 폼 제출 시 API를 호출하고 응답으로 받은 댓글을 목록에 추가한다.
  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !post) return

    const content = commentInput.trim()
    if (!content) return

    setCommentError('')
    setIsSubmitting(true)

    try {
      const created = await createComment(token, post.id, content)
      setState({
        kind: 'ready',
        post: { ...post, comments: [...post.comments, created] },
      })
      setCommentInput('')
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : '댓글 작성에 실패했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // 댓글 삭제 시 API를 호출하고 목록에서 해당 댓글을 제거한다.
  async function handleCommentDelete(commentId: string) {
    if (!token || !post) return
    if (!window.confirm('이 댓글을 삭제할까요?')) return

    setCommentError('')
    try {
      await deleteComment(token, post.id, commentId)
      setState({
        kind: 'ready',
        post: {
          ...post,
          comments: post.comments.filter((c) => c.id !== commentId),
        },
      })
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : '댓글 삭제에 실패했습니다.',
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

            {post.places.length > 0 && (
              <section className="course-section" aria-labelledby="course-title">
                <h2 id="course-title">코스 경로</h2>
                <CourseMap places={post.places} height={360} />
                <ol className="course-list">
                  {post.places.map((place, index) => (
                    <li key={place.id}>
                      <span className="place-order">{index + 1}</span>
                      <div className="place-course-info">
                        <strong>{place.name}</strong>
                        {place.address && <span>{place.address}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

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
              <h2 id="comments-title">댓글 {post.comments.length}</h2>

              {post.comments.length === 0 && (
                <p className="status-text">아직 댓글이 없습니다.</p>
              )}
              {post.comments.map((comment) => {
                const canDeleteComment = Boolean(
                  user && comment.author.id === user.id,
                )
                return (
                  <article className="comment-item" key={comment.id}>
                    <div className="comment-head">
                      <strong>{comment.author.name}</strong>
                      <span className="comment-date">
                        {formatDate(comment.createdAt)}
                      </span>
                      {canDeleteComment && (
                        <button
                          type="button"
                          className="comment-delete"
                          onClick={() => handleCommentDelete(comment.id)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <p>{comment.content}</p>
                  </article>
                )
              })}

              {token ? (
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                  <textarea
                    value={commentInput}
                    onChange={(event) => setCommentInput(event.target.value)}
                    placeholder="이 여행 코스에 대한 생각을 남겨보세요."
                    rows={3}
                    maxLength={1000}
                  />
                  {commentError && (
                    <p className="error-message">{commentError}</p>
                  )}
                  <div className="comment-form-actions">
                    <button
                      type="submit"
                      disabled={isSubmitting || !commentInput.trim()}
                    >
                      {isSubmitting ? '등록 중...' : '댓글 등록'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="status-text">
                  댓글을 작성하려면 <Link to="/">로그인</Link>이 필요합니다.
                </p>
              )}
            </section>
          </article>
        )}
      </section>
    </main>
  )
}
