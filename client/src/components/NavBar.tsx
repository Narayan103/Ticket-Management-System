import { Link, useNavigate } from 'react-router-dom'
import { signOut, useSession } from '../lib/auth-client'
import { Role } from '../types/role'

function NavBar() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut({ fetchOptions: { onSuccess: () => navigate('/login', { replace: true }) } })
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-semibold text-purple-600 dark:text-purple-400">
          Ticket Management
        </Link>
        {session?.user.role === Role.ADMIN && (
          <Link
            to="/users"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Users
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
            {session?.user.name?.charAt(0).toUpperCase()}
          </span>
          <span className="text-sm text-neutral-700 dark:text-neutral-300">{session?.user.name}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-md border border-purple-200 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export default NavBar
