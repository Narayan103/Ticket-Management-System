import { LayoutDashboardIcon, LogOutIcon, RadarIcon, TicketIcon, UsersIcon } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/ThemeToggle'
import { signOut, useSession } from '@/lib/auth-client'
import { Role } from '@/types/role'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboardIcon, end: true },
  { to: '/tickets', label: 'Tickets', icon: TicketIcon, end: false },
]

function AppSidebar() {
  const { data: session } = useSession()
  const location = useLocation()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut({ fetchOptions: { onSuccess: () => navigate('/login', { replace: true }) } })
  }

  function isActive(to: string, end: boolean) {
    return end ? location.pathname === to : location.pathname.startsWith(to)
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <Link to="/dashboard" className="flex items-center gap-2 px-1 font-heading font-semibold text-sidebar-primary">
          <RadarIcon className="size-5" aria-hidden />
          <span>Sahyog</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton isActive={isActive(to, end)} render={<Link to={to} />}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {session?.user.role === Role.ADMIN && (
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isActive('/users', true)} render={<Link to="/users" />}>
                    <UsersIcon />
                    <span>Users</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
            {session?.user.name?.charAt(0).toUpperCase()}
          </span>
          <span className="truncate text-sm text-sidebar-foreground">{session?.user.name}</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
          <LogOutIcon />
          Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
