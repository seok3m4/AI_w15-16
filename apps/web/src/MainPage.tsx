// 📌 홈(랜딩) 화면. 서비스 소개 히어로와 기능 카드, 로그인 상태별 CTA를 보여준다.
import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'

const FEATURES = [
  {
    icon: '🗺️',
    title: '지도로 보는 코스',
    desc: '경유지를 순서대로 지도에 표시해 코스 전체를 한눈에 확인할 수 있어요.',
  },
  {
    icon: '🔎',
    title: '검색과 태그',
    desc: '도시·키워드·태그로 원하는 여행 스타일의 코스를 빠르게 찾아보세요.',
  },
  {
    icon: '💬',
    title: '댓글로 토론',
    desc: '직접 다녀온 사람들과 후기를 나누고 다음 여행 아이디어를 얻어보세요.',
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
            코스를 올리고 댓글로 이야기를 나눠보세요.
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
        <section className="feature-grid" aria-label="주요 기능">
          {FEATURES.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon" aria-hidden>
                {feature.icon}
              </span>
              <h2>{feature.title}</h2>
              <p>{feature.desc}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
