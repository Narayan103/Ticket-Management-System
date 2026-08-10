import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/auth-client'
import AppSidebar from './AppSidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from './ui/sidebar'

function ProtectedLayout() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <div className="flex min-h-screen items-center justify-center">Loading…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="m-2" />
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default ProtectedLayout
