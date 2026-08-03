import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { signIn, useSession } from '../lib/auth-client'

function LoginPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isPending && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    await signIn.email(
      { email, password },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (ctx) => setError(ctx.error.message ?? 'Invalid email or password'),
      },
    )
    setSubmitting(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-neutral-200 p-8 shadow-sm dark:border-neutral-700"
      >
        <h1 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Sign in
        </h1>

        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-purple-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-purple-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-50"
        />

        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
