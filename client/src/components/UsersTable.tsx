import { PencilIcon } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Role } from '@/types/role'

export type User = { id: string; name: string; email: string; role: Role; createdAt: string }

type UsersTableProps = { users: User[]; isPending: boolean; onEditUser: (user: User) => void }

function UsersTable({ users, isPending, onEditUser }: UsersTableProps) {
  if (isPending) {
    return (
      <Table className="mt-6">
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
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-48" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  if (users.length === 0) {
    return <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No users found.</p>
  }

  return (
    <Table className="mt-6">
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
            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${user.name}`}
                onClick={() => onEditUser(user)}
              >
                <PencilIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default UsersTable
