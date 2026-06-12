// 📌 React 앱의 최상위 컴포넌트. 공통 Layout으로 헤더/푸터를 감싸고 페이지를 라우팅한다.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './AuthContext'
import { Layout } from './Layout'
import { LoginPage } from './LoginPage'
import { MainPage } from './MainPage'
import { MyPage } from './MyPage'
import { PostDetailPage } from './PostDetailPage'
import { PostFormPage } from './PostFormPage'
import { PostListPage } from './PostListPage'
import { SignupPage } from './SignupPage'
import { useAuth } from './useAuth'

// 이미 로그인한 사용자가 로그인/회원가입 화면에 접근하면 홈으로 돌려보낸다.
function LoginRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/" replace /> : <LoginPage />
}

function SignupRoute() {
  const { token } = useAuth()
  return token ? <Navigate to="/" replace /> : <SignupPage />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 인증 화면은 헤더/푸터 없는 단독 레이아웃 */}
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/signup" element={<SignupRoute />} />

          {/* 나머지 페이지는 공통 헤더/푸터를 가진 Layout 안에서 렌더링 */}
          <Route element={<Layout />}>
            <Route path="/" element={<MainPage />} />
            <Route path="/posts" element={<PostListPage />} />
            <Route path="/posts/new" element={<PostFormPage />} />
            <Route path="/posts/:id" element={<PostDetailPage />} />
            <Route path="/posts/:id/edit" element={<PostFormPage />} />
            <Route path="/me" element={<MyPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
