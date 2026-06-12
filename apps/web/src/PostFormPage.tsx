// 📌 여행 코스 게시글 작성/수정에 함께 사용하는 폼 화면. 태그 입력과 코스 경유지(지도)를 포함한다.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { createPost, getPost, updatePost, type PostPayload } from './api'
import { PlaceEditor, type PlaceDraft } from './PlaceEditor'
import { useAuth } from './useAuth'

type FormState = {
  title: string
  content: string
  city: string
  duration: string
  tags: string
}

const emptyForm: FormState = {
  title: '',
  content: '',
  city: '',
  duration: '',
  tags: '',
}

// 쉼표로 구분된 태그 문자열을 배열로 바꾼다. (공백/중복 제거)
function parseTags(raw: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    const key = name.toLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      result.push(name)
    }
  }
  return result
}

export function PostFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const isEditMode = Boolean(id)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [places, setPlaces] = useState<PlaceDraft[]>([])
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return

    let isMounted = true

    // 수정 모드에서는 기존 게시글 정보를 불러와 폼과 경유지에 채운다.
    getPost(id)
      .then((post) => {
        if (!isMounted) return
        setForm({
          title: post.title,
          content: post.content,
          city: post.city,
          duration: post.duration ? String(post.duration) : '',
          tags: post.tags.map((tag) => tag.name).join(', '),
        })
        setPlaces(
          post.places.map((place) => ({
            name: place.name,
            address: place.address ?? undefined,
            lat: place.lat,
            lng: place.lng,
          })),
        )
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
    return <Navigate to="/login" replace />
  }

  const authToken = token

  // input name을 기준으로 같은 핸들러에서 모든 폼 값을 갱신한다.
  function updateField(name: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  // duration/tags/places는 선택값이므로 정리해서 payload를 만든다.
  function buildPayload(): PostPayload {
    const payload: PostPayload = {
      title: form.title,
      content: form.content,
      city: form.city,
      tags: parseTags(form.tags),
      // 화면에 보이는 순서를 그대로 코스 순서(order)로 저장한다.
      places: places.map((place, index) => ({
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        order: index,
      })),
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
                  placeholder="예: 부산, 강릉, 제주"
                  required
                />
              </label>
              <label>
                여행 기간
                <input
                  type="number"
                  min="1"
                  value={form.duration}
                  onChange={(event) =>
                    updateField('duration', event.target.value)
                  }
                  placeholder="예: 3"
                />
              </label>
            </div>

            <div className="form-field-block">
              <span className="field-label">코스 경유지</span>
              <PlaceEditor places={places} onChange={setPlaces} />
            </div>

            <label>
              태그
              <input
                type="text"
                value={form.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="쉼표로 구분 (예: 단풍, 료칸, 가족여행)"
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
