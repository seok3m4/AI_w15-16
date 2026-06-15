// 📌 게시판 AI 질문 페이지. 질문하면 AI Agent가 도구를 골라 답한다.
//   - search_similar_posts(RAG): 게시판 코스 후기 검색
//   - place_search(MCP): 실제 장소 위치·주소 검색
// 답변과 함께, 답변에 실제로 언급된 장소를 카카오맵 카드로 보여준다.
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { askAgent, type AgentAnswer, type AgentPlace } from './api'

// 처음 보여줄 예시 질문들. 클릭하면 바로 질문이 채워진다.
const EXAMPLES = [
  '부산에서 바다랑 맛집 같이 즐길 코스 추천해줘',
  '혼자 조용히 힐링하기 좋은 코스 있어?',
  '광안리 해수욕장은 어디에 있어?',
]

type AskState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: AgentAnswer }

// 장소의 카카오맵 링크를 만든다.
// MCP가 준 장소 상세 페이지 URL(place.map.kakao.com/...)이 있으면 우선 쓰고,
// 없으면 이름·좌표로 지도 핀 링크를 만든다.
function kakaoPlaceUrl(place: AgentPlace) {
  if (place.url) {
    return place.url.replace(/^http:/, 'https:')
  }
  return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${
    place.lat
  },${place.lng}`
}

// 비교용: 공백/대소문자를 지운 문자열.
function squash(text: string) {
  return text.replace(/\s+/g, '').toLowerCase()
}

// 답변 본문에 실제로 언급된 장소만 추린다.
// (place_search가 함께 가져오는 "○○ 주차장" 같은 노이즈를 자동으로 걸러낸다)
function pickMentionedPlaces(answer: string, places: AgentPlace[]): AgentPlace[] {
  const answerKey = squash(answer)
  const seen = new Set<string>()
  return places.filter((place) => {
    if (seen.has(place.name)) return false
    const mentioned = answerKey.includes(squash(place.name))
    if (mentioned) seen.add(place.name)
    return mentioned
  })
}

export function AskPage() {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<AskState>({ kind: 'idle' })

  async function submit(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 2) return

    setState({ kind: 'loading' })
    try {
      const result = await askAgent(trimmed)
      setState({ kind: 'ready', result })
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error ? error.message : 'AI 답변을 받지 못했습니다.',
      })
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submit(question)
  }

  function handleExample(example: string) {
    setQuestion(example)
    void submit(example)
  }

  const result = state.kind === 'ready' ? state.result : null
  // 답변에 언급된 장소만, 없으면 fallback으로 MCP가 찾은 장소 전체를 보여준다.
  const mentionedPlaces = result
    ? pickMentionedPlaces(result.answer, result.places)
    : []
  const placesToShow =
    mentionedPlaces.length > 0 ? mentionedPlaces : result?.places ?? []

  return (
    <main className="app-page">
      <section className="content-shell narrow">
        <header className="page-header">
          <div>
            <p className="eyebrow">AI 여행 도우미</p>
            <h1>게시판에 물어보기</h1>
            <p className="dashboard-copy">
              AI가 게시판 코스 후기와 실제 장소 정보를 찾아 답해드려요.
            </p>
          </div>
        </header>

        <form className="ask-form" onSubmit={handleSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="예: 부산에서 2박 3일 바다 코스 추천해줘 / 전주 한옥마을은 어디야?"
            rows={3}
            maxLength={500}
          />
          <div className="ask-form-actions">
            <button
              type="submit"
              disabled={state.kind === 'loading' || question.trim().length < 2}
            >
              {state.kind === 'loading' ? '생각하는 중...' : 'AI에게 물어보기'}
            </button>
          </div>
        </form>

        {state.kind === 'idle' && (
          <div className="ask-examples">
            <p className="ask-examples-label">이런 걸 물어볼 수 있어요</p>
            <div className="ask-examples-list">
              {EXAMPLES.map((example) => (
                <button
                  type="button"
                  className="ask-example-chip"
                  key={example}
                  onClick={() => handleExample(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.kind === 'loading' && (
          <p className="status-text">
            게시판 코스와 장소 정보를 찾아 답변을 정리하고 있어요...
          </p>
        )}

        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}

        {result && (
          <div className="ask-result">
            <div className="ask-answer">
              <span className="ask-answer-badge">AI 답변</span>
              <p>{result.answer}</p>

              {/* 답변에 나온 장소를 카카오맵 칩으로 — 클릭하면 카카오맵 장소 페이지로 */}
              {placesToShow.length > 0 && (
                <div className="ask-place-chips">
                  {placesToShow.map((place) => (
                    <a
                      key={`${place.name}-${place.lat}`}
                      className="ask-place-chip"
                      href={kakaoPlaceUrl(place)}
                      target="_blank"
                      rel="noreferrer"
                      title={`카카오맵에서 ${place.name} 보기`}
                    >
                      <span className="ask-place-chip-pin" aria-hidden>
                        📍
                      </span>
                      <span className="ask-place-chip-name">{place.name}</span>
                      <span className="ask-place-chip-arrow" aria-hidden>
                        ↗
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {result.sources.length > 0 && (
              <div className="ask-sources">
                <p className="ask-sources-label">참고한 코스</p>
                <ol className="ask-sources-list">
                  {result.sources.map((source, index) => (
                    <li key={source.id}>
                      <Link to={`/posts/${source.id}`} className="ask-source-card">
                        <span className="ask-source-num">{index + 1}</span>
                        <div className="ask-source-info">
                          <strong>{source.title}</strong>
                          <span>
                            {source.city} · 작성자 {source.authorName}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
