// 📌 여행 코스 게시글 작성/수정에 함께 사용하는 폼 화면. 태그 입력과 코스 경유지(지도)를 포함한다.
import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { createPost, getPost, updatePost, type PostPayload } from './api'
import { fileToResizedDataUrl } from './image'
import { PlaceEditor, type PlaceDraft } from './PlaceEditor'
import { useAuth } from './useAuth'

type FormState = {
  title: string
  content: string
  city: string
  duration: string
  tags: string
  // 대표 사진 (리사이즈된 base64 data URL). 없으면 빈 문자열.
  thumbnailUrl: string
}

const emptyForm: FormState = {
  title: '',
  content: '',
  city: '',
  duration: '',
  tags: '',
  thumbnailUrl: '',
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
  const [thumbnailBusy, setThumbnailBusy] = useState(false)

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
          thumbnailUrl: post.thumbnailUrl ?? '',
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

  // 파일 선택 시 브라우저에서 리사이즈해 base64로 폼에 담는다.
  async function handleThumbnailChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = '' // 같은 파일을 다시 골라도 onChange가 동작하도록 초기화
    if (!file) return

    setError('')
    setThumbnailBusy(true)
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      updateField('thumbnailUrl', dataUrl)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '사진을 처리하지 못했습니다.',
      )
    } finally {
      setThumbnailBusy(false)
    }
  }

  function removeThumbnail() {
    updateField('thumbnailUrl', '')
  }

  // duration/tags/places는 선택값이므로 정리해서 payload를 만든다.
  function buildPayload(): PostPayload {
    const payload: PostPayload = {
      title: form.title,
      content: form.content,
      city: form.city,
      // 빈 문자열이면 null로 보내 사진을 비운다.
      thumbnailUrl: form.thumbnailUrl || null,
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
            <section className="form-section">
              <div className="form-section-head">
                <span className="form-section-num">1</span>
                <div>
                  <h2>기본 정보</h2>
                  <p>어떤 여행이었는지 제목과 소개로 알려주세요.</p>
                </div>
              </div>

              <div className="thumb-uploader">
                {form.thumbnailUrl ? (
                  <div className="thumb-preview">
                    <img src={form.thumbnailUrl} alt="대표 사진 미리보기" />
                    <div className="thumb-preview-actions">
                      <label className="thumb-button">
                        사진 변경
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleThumbnailChange}
                          hidden
                        />
                      </label>
                      <button
                        type="button"
                        className="thumb-button thumb-button-remove"
                        onClick={removeThumbnail}
                      >
                        제거
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="thumb-dropzone">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      hidden
                    />
                    <span className="thumb-dropzone-icon" aria-hidden>
                      🖼️
                    </span>
                    <span className="thumb-dropzone-text">
                      {thumbnailBusy ? '사진 처리 중...' : '대표 사진 추가'}
                    </span>
                    <span className="thumb-dropzone-hint">
                      클릭해서 내 파일에서 이미지를 선택하세요 (선택)
                    </span>
                  </label>
                )}
              </div>

              <label>
                제목
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  placeholder="예: 부산 2박 3일 바다와 골목 맛집 코스"
                  required
                />
              </label>
              <label>
                소개
                <textarea
                  value={form.content}
                  onChange={(event) =>
                    updateField('content', event.target.value)
                  }
                  rows={8}
                  placeholder="코스를 어떻게 다녔는지, 어떤 점이 좋았는지 자유롭게 적어주세요."
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  도시
                  <input
                    type="text"
                    value={form.city}
                    onChange={(event) =>
                      updateField('city', event.target.value)
                    }
                    placeholder="예: 부산, 강릉, 제주"
                    required
                  />
                </label>
                <label>
                  여행 기간 (일)
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
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <span className="form-section-num">2</span>
                <div>
                  <h2>코스 경유지</h2>
                  <p>장소를 검색해 순서대로 추가하면 지도에 코스로 표시돼요.</p>
                </div>
              </div>
              <PlaceEditor places={places} onChange={setPlaces} />
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <span className="form-section-num">3</span>
                <div>
                  <h2>태그</h2>
                  <p>쉼표로 구분해 입력하면 검색·분류에 쓰여요. (선택)</p>
                </div>
              </div>
              <input
                className="block-input"
                type="text"
                value={form.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="예: 맛집, 바다, 가족여행"
              />
            </section>

            {error && <p className="error-message">{error}</p>}

            <div className="form-actions">
              <Link
                className="secondary-link-button"
                to={id ? `/posts/${id}` : '/posts'}
              >
                취소
              </Link>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : isEditMode ? '수정 완료' : '코스 게시'}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
