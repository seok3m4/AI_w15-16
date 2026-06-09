// 📌 화면을 그리는 최상위 컴포넌트. 백엔드 /health API를 호출하고 결과를 표시한다.
import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  service: string
  database: string
}

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ok'; data: HealthResponse }
  | { kind: 'error'; message: string }

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

function App() {
  const [state, setState] = useState<FetchState>({ kind: 'loading' })

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as HealthResponse
      })
      .then((data) => setState({ kind: 'ok', data }))
      .catch((err: Error) => setState({ kind: 'error', message: err.message }))
  }, [])

  return (
    <main style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
      <h1>CineReview AI</h1>
      <h2>Backend health check</h2>
      <p style={{ color: '#666' }}>GET {API_BASE}/health</p>
      {state.kind === 'loading' && <p>Loading…</p>}
      {state.kind === 'error' && (
        <pre style={{ color: 'crimson' }}>Error: {state.message}</pre>
      )}
      {state.kind === 'ok' && (
        <pre style={{ background: '#f4f4f4', padding: 12 }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
    </main>
  )
}

export default App
