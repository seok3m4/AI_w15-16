// 📌 React 앱의 최상위 컴포넌트. 인증 상태에 따라 페이지 라우팅을 처리한다.
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './AuthContext'
import { LoginPage } from './LoginPage'
import { MainPage } from './MainPage'
import { PostDetailPage } from './PostDetailPage'
import { PostFormPage } from './PostFormPage'
import { PostListPage } from './PostListPage'
import { SignupPage } from './SignupPage'
import { useAuth } from './useAuth'

// 루트 경로는 로그인 상태면 메인 화면, 아니면 로그인 화면을 보여준다.
function HomeRoute() {
  const { token } = useAuth()

  return token ? <MainPage /> : <LoginPage />
}

// 이미 로그인한 사용자가 회원가입 화면에 접근하면 메인 화면으로 돌려보낸다.
function SignupRoute() {
  const { token } = useAuth()

  return token ? <Navigate to="/" replace /> : <SignupPage />
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/signup" element={<SignupRoute />} />
          <Route path="/posts" element={<PostListPage />} />
          <Route path="/posts/new" element={<PostFormPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/posts/:id/edit" element={<PostFormPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
