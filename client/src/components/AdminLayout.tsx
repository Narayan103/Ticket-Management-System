import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/auth-client'
import { Role } from '../types/role'

function AdminLayout() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (session?.user.role !== Role.ADMIN) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default AdminLayout
