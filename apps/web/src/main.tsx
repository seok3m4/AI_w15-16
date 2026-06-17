// 📌 React 앱의 시작점. index.html의 <div id="root">에 App 컴포넌트를 붙인다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
