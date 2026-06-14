// 📌 게시판 Q&A 페이지. 질문을 입력하면 기존 코스 후기를 근거로 AI가 답변한다. (RAG)
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { askRag, type AskResponse } from './api'

// 처음 보여줄 예시 질문들. 클릭하면 바로 질문이 채워진다.
const EXAMPLES = [
  '부산에서 바다랑 맛집 같이 즐길 코스 추천해줘',
  '혼자 조용히 힐링하기 좋은 코스 있어?',
  '강릉 1박 2일이면 어디를 가면 좋아?',
]

type AskState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: AskResponse }

export function AskPage() {
  const [question, setQuestion] = useState('')
  const [state, setState] = useState<AskState>({ kind: 'idle' })

  async function submit(q: string) {
    const trimmed = q.trim()
    if (trimmed.length < 2) return

    setState({ kind: 'loading' })
    try {
      const result = await askRag(trimmed)
      setState({ kind: 'ready', result })
    } catch (error) {
      setState({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'AI 답변을 받지 못했습니다.',
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

  return (
    <main className="app-page">
      <section className="content-shell narrow">
        <header className="page-header">
          <div>
            <p className="eyebrow">AI 여행 도우미</p>
            <h1>게시판에 물어보기</h1>
            <p className="dashboard-copy">
              지금까지 공유된 여행 코스 후기들을 근거로 AI가 답해드려요.
            </p>
          </div>
        </header>

        <form className="ask-form" onSubmit={handleSubmit}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="예: 부산에서 2박 3일 바다 코스 추천해줘"
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
          <p className="status-text">후기를 찾아보고 답변을 정리하고 있어요...</p>
        )}

        {state.kind === 'error' && (
          <p className="error-message">{state.message}</p>
        )}

        {state.kind === 'ready' && (
          <div className="ask-result">
            <div className="ask-answer">
              <span className="ask-answer-badge">AI 답변</span>
              <p>{state.result.answer}</p>
            </div>

            {state.result.sources.length > 0 && (
              <div className="ask-sources">
                <p className="ask-sources-label">참고한 코스</p>
                <ol className="ask-sources-list">
                  {state.result.sources.map((source, index) => (
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
