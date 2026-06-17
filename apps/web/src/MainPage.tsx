// 📌 홈(랜딩) 화면. Toss Bank처럼 큰 첫 화면과 넓은 소개 섹션으로 서비스를 보여준다.
import { Link } from 'react-router-dom'
import { useAuth } from './useAuth'

const SHOWCASE_ITEMS = [
  {
    kicker: 'Course Board',
    title: '코스를 글로만 보지 않고, 지도 위 동선으로 확인해요.',
    desc: '장소를 검색해 일차별로 추가하고, 순서를 드래그해 바꾸면 지도에 번호 마커와 경로선이 함께 표시됩니다.',
    linkText: '코스 둘러보기',
    to: '/posts',
  },
  {
    kicker: 'AI Assistant',
    title: '질문하면 게시판 후기와 실제 장소 정보를 함께 찾아요.',
    desc: 'RAG로 기존 코스를 검색하고, MCP 장소 검색 도구로 실제 위치와 카카오맵 링크까지 확인합니다.',
    linkText: 'AI에게 물어보기',
    to: '/ask',
  },
  {
    kicker: 'My Travel',
    title: '마음에 드는 코스는 저장하고, 내 여행 기록은 따로 모아요.',
    desc: '저장한 코스와 직접 작성한 코스를 마이페이지에서 분리해 확인할 수 있습니다.',
    linkText: '마이페이지 보기',
    to: '/me',
  },
]

export function MainPage() {
  const { token, user, isLoading } = useAuth()

  return (
    <main className="app-page home-page">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="eyebrow">Jungle Travel</p>
            <h1 id="hero-title">
              여행 코스도
              <br />
              더 쉽게 발견하세요
            </h1>
            <p>
              국내 숨은 여행 코스를 지도로 보고, 저장하고, AI에게 바로
              물어보는 여행 커뮤니티입니다.
            </p>
            <div className="hero-actions">
              <Link className="primary-link-button hero-main-button" to="/posts">
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

          <div className="hero-visual" aria-hidden>
            <div className="hero-phone">
              <div className="hero-phone-top">
                <span>오늘의 추천</span>
                <strong>제주 2박 3일</strong>
              </div>
              <div className="hero-route">
                <span>성산일출봉</span>
                <span>비자림</span>
                <span>월정리 해변</span>
              </div>
              <div className="hero-map-preview">
                <span className="map-pin pin-one">1</span>
                <span className="map-pin pin-two">2</span>
                <span className="map-pin pin-three">3</span>
              </div>
            </div>
            <div className="hero-floating-card">
              <span>AI 답변</span>
              <strong>가족 여행이면 동선이 짧은 동쪽 코스를 추천해요.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="home-showcase" aria-label="주요 기능">
        {SHOWCASE_ITEMS.map((item, index) => (
          <article
            className={
              index % 2 === 1
                ? 'showcase-section reverse'
                : 'showcase-section'
            }
            key={item.title}
          >
            <div className="showcase-copy">
              <p className="eyebrow">{item.kicker}</p>
              <h2>{item.title}</h2>
              <p>{item.desc}</p>
              <Link className="showcase-link" to={item.to}>
                {item.linkText}
              </Link>
            </div>
            <div className="showcase-panel" aria-hidden>
              {index === 0 && (
                <div className="route-card-preview">
                  <span>1일차</span>
                  <strong>부산 바다 산책 코스</strong>
                  <ol>
                    <li>흰여울문화마을</li>
                    <li>영도 카페거리</li>
                    <li>광안리 해변</li>
                  </ol>
                </div>
              )}
              {index === 1 && (
                <div className="ai-card-preview">
                  <span>질문</span>
                  <strong>혼자 힐링하기 좋은 강릉 코스 있어?</strong>
                  <p>
                    게시판 후기와 장소 검색을 함께 확인해서 조용한 바다 코스를
                    추천할게요.
                  </p>
                </div>
              )}
              {index === 2 && (
                <div className="saved-card-preview">
                  <span>마이페이지</span>
                  <strong>작성한 코스 4개</strong>
                  <strong>저장한 코스 9개</strong>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="home-final-cta" aria-labelledby="home-final-title">
        <p className="eyebrow">Start</p>
        <h2 id="home-final-title">다음 여행 코스를 지금 찾아보세요.</h2>
        <div className="hero-actions">
          <Link className="primary-link-button hero-main-button" to="/posts">
            코스 보러가기
          </Link>
          {token ? (
            <Link className="hero-secondary-button dark" to="/posts/new">
              코스 작성하기
            </Link>
          ) : (
            <Link className="hero-secondary-button dark" to="/login">
              로그인
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
