import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import TableSkeleton from '@/components/TableSkeleton'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/format-date'
import { Role } from '@/types/role'

export type User = { id: string; name: string; email: string; role: Role; createdAt: string }

type UsersTableProps = {
  users: User[]
  isPending: boolean
  onEditUser: (user: User) => void
  onDeleteUser: (user: User) => void
}

function UsersTable({ users, isPending, onEditUser, onDeleteUser }: UsersTableProps) {
  if (isPending) {
    return (
      <TableSkeleton
        header={
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-px">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
        }
        columnWidths={['w-32', 'w-48', 'w-16', 'w-24', 'w-8']}
      />
    )
  }

  if (users.length === 0) {
    return <EmptyState message="No users found." />
  }

  return (
    <Card className="mt-6 gap-0 p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-px">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                  {user.name}
                </div>
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === Role.ADMIN ? 'secondary' : 'outline'}>{user.role}</Badge>
              </TableCell>
              <TableCell className="font-mono text-sm tabular-nums">{formatDate(user.createdAt)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${user.name}`}
                    onClick={() => onEditUser(user)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`Delete ${user.name}`}
                    title={user.role === Role.ADMIN ? 'Admin users cannot be deleted' : undefined}
                    disabled={user.role === Role.ADMIN}
                    onClick={() => onDeleteUser(user)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default UsersTable
