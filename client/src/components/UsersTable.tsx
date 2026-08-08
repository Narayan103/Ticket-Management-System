import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span
                  className={
                    user.role === Role.ADMIN
                      ? 'font-medium text-purple-600 dark:text-purple-400'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }
                >
                  {user.role}
                </span>
              </TableCell>
              <TableCell>{formatDate(user.createdAt)}</TableCell>
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
