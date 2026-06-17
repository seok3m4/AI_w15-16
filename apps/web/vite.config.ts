// 📌 Vite 설정. React 플러그인을 등록해서 개발 서버와 빌드를 구성한다.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // apps/web에서 실행해도 루트 .env의 VITE_API_BASE_URL을 읽게 한다.
  envDir: '../..',
  plugins: [react()],
})
