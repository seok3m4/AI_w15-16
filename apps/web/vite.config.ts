// 📌 Vite 설정. React 플러그인을 등록해서 개발 서버와 빌드를 구성한다.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
