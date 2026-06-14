// 📌 모든 페이지를 감싸는 공통 레이아웃. 헤더(네비+사용자 정보)와 푸터를 제공한다.
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function Layout() {
  const { token, user, logout } = useAuth()
  const navigate = useNavigate()

  // 사용자 이름의 첫 글자를 아바타 이니셜로 쓴다.
  const initial = user?.name?.trim().charAt(0).toUpperCase() ?? '?'

  // 로그아웃 후에는 현재 페이지(특히 로그인 전용 페이지)에 머무르지 않고 홈으로 이동한다.
  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden>
              ✈
            </span>
            <span className="brand-name">정글 여행</span>
          </Link>

          <nav className="site-nav" aria-label="주요 메뉴">
            <NavLink
              to="/posts"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              게시판
            </NavLink>
            <NavLink
              to="/ask"
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              AI 질문
            </NavLink>
            {token && (
              <NavLink
                to="/posts/new"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                코스 작성
              </NavLink>
            )}
            {token && (
              <NavLink
                to="/me"
                className={({ isActive }) =>
                  isActive ? 'nav-link active' : 'nav-link'
                }
              >
                마이페이지
              </NavLink>
            )}
          </nav>

          <div className="site-auth">
            {token ? (
              <>
                <div className="user-chip" title={user?.email}>
                  <span className="user-avatar" aria-hidden>
                    {initial}
                  </span>
                  <span className="user-name">{user?.name ?? '사용자'}</span>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link className="ghost-button" to="/login">
                  로그인
                </Link>
                <Link className="primary-link-button compact" to="/signup">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <Outlet />

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="footer-brand">
            <span className="brand-mark" aria-hidden>
              ✈
            </span>
            <div>
              <strong>정글 여행</strong>
              <p>직접 다녀온 국내 여행 코스를 지도로 공유하는 커뮤니티</p>
            </div>
          </div>
          <nav className="footer-links" aria-label="푸터 메뉴">
            <Link to="/posts">게시판</Link>
            {token && <Link to="/posts/new">코스 작성</Link>}
            <a
              href="https://developers.kakao.com"
              target="_blank"
              rel="noreferrer"
            >
              Kakao Maps
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 정글 여행</span>
          <span>React · NestJS · PostgreSQL · Kakao Maps</span>
        </div>
      </footer>
    </div>
  )
}
