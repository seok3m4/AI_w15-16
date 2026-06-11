// 📌 로그인 후 보이는 메인 화면. 현재 사용자 이름과 로그아웃 버튼을 보여준다.
import { useAuth } from './useAuth'

export function MainPage() {
  const { user, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <main className="app-page">
        <p className="status-text">사용자 정보를 불러오는 중...</p>
      </main>
    )
  }

  return (
    <main className="app-page">
      <section className="dashboard-header" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">숨겨진 여행 코스</p>
          <h1 id="dashboard-title">
            {user ? `${user.name}님, 환영합니다.` : '로그인이 필요합니다.'}
          </h1>
          <p className="dashboard-copy">
            여행 코스 공유 게시판의 인증 흐름이 연결된 상태입니다.
          </p>
        </div>
        <button type="button" className="secondary-button" onClick={logout}>
          로그아웃
        </button>
      </section>
    </main>
  )
}
