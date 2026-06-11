// 📌 여행 코스 게시글 작성/수정에 함께 사용하는 폼 화면.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { createPost, getPost, updatePost, type PostPayload } from './api'
import { useAuth } from './useAuth'

type FormState = {
  title: string
  content: string
  city: string
  country: string
  duration: string
}

const emptyForm: FormState = {
  title: '',
  content: '',
  city: '',
  country: '',
  duration: '',
}

export function PostFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const isEditMode = Boolean(id)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    let isMounted = true

    // 수정 모드에서는 기존 게시글 정보를 불러와 폼에 채운다.
    getPost(id)
      .then((post) => {
        if (!isMounted) return
        setForm({
          title: post.title,
          content: post.content,
          city: post.city,
          country: post.country,
          duration: post.duration ? String(post.duration) : '',
        })
      })
      .catch((err) => {
        if (!isMounted) return
        setError(
          err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.',
        )
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  if (!token) {
    return <Navigate to="/" replace />
  }

  const authToken = token

  // input name을 기준으로 같은 핸들러에서 모든 폼 값을 갱신한다.
  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  // duration은 선택값이므로 비어 있으면 payload에서 제외한다.
  function buildPayload(): PostPayload {
    const payload: PostPayload = {
      title: form.title,
      content: form.content,
      city: form.city,
      country: form.country,
    }

    if (form.duration.trim()) {
      payload.duration = Number(form.duration)
    }

    return payload
  }

  // 작성/수정 모드에 맞는 API를 호출하고 성공하면 상세 화면으로 이동한다.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const savedPost =
        isEditMode && id
          ? await updatePost(authToken, id, buildPayload())
          : await createPost(authToken, buildPayload())

      navigate(`/posts/${savedPost.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 저장에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-page">
      <section className="content-shell narrow">
        <Link className="text-link" to={id ? `/posts/${id}` : '/posts'}>
          돌아가기
        </Link>
        <header className="page-header compact">
          <div>
            <p className="eyebrow">여행 코스 작성</p>
            <h1>{isEditMode ? '코스 수정' : '새 코스 작성'}</h1>
          </div>
        </header>

        {isLoading && <p className="status-text">폼을 불러오는 중...</p>}
        {!isLoading && (
          <form className="post-form" onSubmit={handleSubmit}>
            <label>
              제목
              <input
                type="text"
                value={form.title}
                onChange={(event) => updateField('title', event.target.value)}
                required
              />
            </label>
            <label>
              본문
              <textarea
                value={form.content}
                onChange={(event) => updateField('content', event.target.value)}
                rows={10}
                required
              />
            </label>
            <div className="form-grid">
              <label>
                도시
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  required
                />
              </label>
              <label>
                국가
                <input
                  type="text"
                  value={form.country}
                  onChange={(event) =>
                    updateField('country', event.target.value)
                  }
                  required
                />
              </label>
            </div>
            <label>
              여행 기간
              <input
                type="number"
                min="1"
                value={form.duration}
                onChange={(event) => updateField('duration', event.target.value)}
                placeholder="예: 3"
              />
            </label>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
