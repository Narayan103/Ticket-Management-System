import { useSession } from '../lib/auth-client'

function HomePage() {
  const { data: session } = useSession()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
        Welcome back, <span className="text-purple-600 dark:text-purple-400">{session?.user.name}</span>
      </h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">
        Your tickets will show up here soon.
      </p>
    </main>
  )
}

export default HomePage
