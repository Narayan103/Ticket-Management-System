import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

function App() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [message, setMessage] = useState('Checking API…')

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setStatus('ok')
        setMessage(`API status: ${data.status}`)
      })
      .catch(() => {
        setStatus('error')
        setMessage('API is unreachable')
      })
  }, [])

  return (
    <main className="app">
      <h1>Ticket Management System</h1>
      <p className={`api-status api-status--${status}`}>{message}</p>
    </main>
  )
}

export default App
