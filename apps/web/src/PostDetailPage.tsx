// 📌 여행 코스 게시글 상세 화면. 본문, 작성자, 태그, 댓글 작성/삭제를 보여준다.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  createComment,
  deleteComment,
  deletePost,
  getPost,
  likeComment,
  savePost,
  unlikeComment,
  unsavePost,
  type TravelPostDetail,
} from './api'
import { CourseMap } from './CourseMap'
import { SimilarPosts } from './SimilarPosts'
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

// 경유지 이름과 좌표로 카카오맵에서 해당 장소 페이지를 여는 링크를 만든다.
function kakaoPlaceUrl(place: { name: string; lat: number; lng: number }) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${
    place.lat
  },${place.lng}`
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
  const [savePending, setSavePending] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [likePendingId, setLikePendingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let isMounted = true

    // URL의 게시글 id로 상세 정보를 조회한다. (토큰이 있으면 저장 여부도 함께 받는다)
    getPost(id, token)
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
  }, [id, token])

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

  // 저장 버튼 토글: 저장돼 있으면 해제, 아니면 저장하고 응답으로 받은 갯수를 반영한다.
  async function handleToggleSave() {
    if (!token || !post) return

    setSaveError('')
    setSavePending(true)
    try {
      const result = post.isSaved
        ? await unsavePost(token, post.id)
        : await savePost(token, post.id)
      setState({
        kind: 'ready',
        post: { ...post, isSaved: result.saved, saveCount: result.saveCount },
      })
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : '저장 처리에 실패했습니다.',
      )
    } finally {
      setSavePending(false)
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

  // 댓글 좋아요 토글: 현재 상태에 따라 좋아요/취소 API를 호출하고 해당 댓글만 갱신한다.
  async function handleCommentLike(commentId: string) {
    if (!token || !post) return

    const target = post.comments.find((comment) => comment.id === commentId)
    if (!target) return

    setCommentError('')
    setLikePendingId(commentId)

    try {
      const result = target.isLiked
        ? await unlikeComment(token, post.id, commentId)
        : await likeComment(token, post.id, commentId)

      setState({
        kind: 'ready',
        post: {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  isLiked: result.liked,
                  likeCount: result.likeCount,
                }
              : comment,
          ),
        },
      })
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : '댓글 좋아요 처리에 실패했습니다.',
      )
    } finally {
      setLikePendingId(null)
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
            {post.thumbnailUrl && (
              <div className="detail-thumb">
                <img src={post.thumbnailUrl} alt="" />
              </div>
            )}
            <header className="detail-header">
              <p className="post-location">{post.city}</p>
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

            <div className="save-bar">
              {token ? (
                <button
                  type="button"
                  className={post.isSaved ? 'save-button saved' : 'save-button'}
                  onClick={handleToggleSave}
                  disabled={savePending}
                >
                  {post.isSaved ? '🔖 저장됨' : '🔖 저장'}
                </button>
              ) : null}
              <span className="save-count">
                {post.saveCount}명이 저장했어요
              </span>
            </div>
            {saveError && <p className="error-message">{saveError}</p>}

            <p className="detail-content">{post.content}</p>

            {post.places.length > 0 && (
              <section className="course-section" aria-labelledby="course-title">
                <h2 id="course-title">코스 경로</h2>
                <CourseMap places={post.places} height={360} />
                <ol className="course-list course-list--links">
                  {post.places.map((place, index) => (
                    <li key={place.id}>
                      <a
                        className="course-place-link"
                        href={kakaoPlaceUrl(place)}
                        target="_blank"
                        rel="noreferrer"
                        title={`카카오맵에서 ${place.name} 보기`}
                      >
                        <span className="place-order">{index + 1}</span>
                        <div className="place-course-info">
                          <strong>{place.name}</strong>
                          {place.address && <span>{place.address}</span>}
                        </div>
                        <span className="course-place-arrow" aria-hidden>
                          ↗
                        </span>
                      </a>
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
                    <div className="comment-actions">
                      {token ? (
                        <button
                          type="button"
                          className={
                            comment.isLiked
                              ? 'comment-like is-liked'
                              : 'comment-like'
                          }
                          onClick={() => handleCommentLike(comment.id)}
                          disabled={likePendingId === comment.id}
                        >
                          ♥ 좋아요 {comment.likeCount}
                        </button>
                      ) : (
                        <span className="comment-like-count">
                          ♥ 좋아요 {comment.likeCount}
                        </span>
                      )}
                    </div>
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
                  댓글을 작성하려면 <Link to="/login">로그인</Link>이 필요합니다.
                </p>
              )}
            </section>

            <SimilarPosts postId={post.id} />
          </article>
        )}
      </section>
    </main>
  )
}
