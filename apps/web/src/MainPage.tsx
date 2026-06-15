// 📌 홈(랜딩) 화면. 서비스 소개 히어로와 기능 카드, 로그인 상태별 CTA를 보여준다.
import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'

const FEATURES = [
  {
    icon: '🗺️',
    title: '지도로 보는 코스',
    desc: '경유지를 순서대로 지도에 표시하고, 장소를 누르면 카카오맵으로 바로 연결돼요.',
  },
  {
    icon: '🔎',
    title: '검색과 태그',
    desc: '도시·키워드·태그로 원하는 여행 스타일의 코스를 빠르게 찾아보세요.',
  },
  {
    icon: '💬',
    title: '댓글과 좋아요',
    desc: '직접 다녀온 사람들과 후기를 나누고, 좋아요로 공감을 남겨보세요.',
  },
  {
    icon: '🔖',
    title: '나중에 볼 코스 저장',
    desc: '마음에 드는 코스를 저장해 마이페이지에서 모아 보고 다음 여행에 활용해요.',
  },
  {
    icon: '✨',
    title: 'AI 코스 추천',
    desc: '게시글마다 분위기가 비슷한 코스를 의미 기반으로 추천해 줘요. (RAG)',
  },
  {
    icon: '🧭',
    title: 'AI 여행 질문',
    desc: '질문하면 AI가 게시판 코스와 실제 장소 정보를 찾아 답해 줘요. (AI Agent + MCP)',
  },
]

export function MainPage() {
  const { token, user, isLoading } = useAuth()

  return (
    <main className="app-page home-page">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-content">
          <p className="eyebrow">Jungle Travel</p>
          <h1 id="hero-title">
            국내 숨은 여행 코스를
            <br />
            발견하고 공유하세요
          </h1>
          <p className="hero-copy">
            현지인처럼 다녀온 국내 도시별 여행 코스를 지도로 한눈에. 직접 만든
            코스를 공유하고, AI에게 코스를 추천받거나 여행을 물어보세요.
          </p>
          <div className="hero-actions">
            <Link className="primary-link-button" to="/posts">
              게시판 둘러보기
            </Link>
            {token ? (
              <Link className="hero-secondary-button" to="/posts/new">
                새 코스 작성
              </Link>
            ) : (
              <Link className="hero-secondary-button" to="/signup">
                회원가입
              </Link>
            )}
          </div>
          {!isLoading && user && (
            <p className="hero-greeting">
              {user.name}님, 다시 오신 걸 환영해요.
            </p>
          )}
        </div>
      </section>

      <div className="content-shell">
        <div className="feature-head">
          <p className="eyebrow">주요 기능</p>
          <h2>정글 여행에서 할 수 있는 것</h2>
          <p className="feature-head-copy">
            코스 공유와 지도부터 AI 추천·여행 질문까지, 여행 준비를 한곳에서.
          </p>
        </div>
        <section className="feature-grid" aria-label="주요 기능">
          {FEATURES.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon" aria-hidden>
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
