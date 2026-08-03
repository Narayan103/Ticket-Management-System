import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/auth-client'
import NavBar from './NavBar'

function ProtectedLayout() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  )
}

export default ProtectedLayout
