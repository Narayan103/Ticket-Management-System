import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { signIn, useSession } from '../lib/auth-client'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  if (!isPending && session) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(data: LoginFormValues) {
    setFormError('')
    await signIn.email(data, {
      onSuccess: () => navigate('/', { replace: true }),
      onError: (ctx) => setFormError(ctx.error.message ?? 'Invalid email or password'),
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white dark:bg-neutral-900">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
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
          autoComplete="email"
          {...register('email')}
          className={`w-full rounded-md border px-3 py-2 text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-neutral-50 ${
            errors.email
              ? 'border-red-500 focus:border-red-500 dark:border-red-500'
              : 'border-neutral-300 focus:border-purple-500 dark:border-neutral-600'
          }`}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}

        <label className="mb-1 mt-4 block text-sm font-medium text-neutral-700 dark:text-neutral-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className={`w-full rounded-md border px-3 py-2 text-neutral-900 focus:outline-none dark:bg-neutral-800 dark:text-neutral-50 ${
            errors.password
              ? 'border-red-500 focus:border-red-500 dark:border-red-500'
              : 'border-neutral-300 focus:border-purple-500 dark:border-neutral-600'
          }`}
        />
        {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}

        {formError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{formError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full rounded-md bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}

export default LoginPage
