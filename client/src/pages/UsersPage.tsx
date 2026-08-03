import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

type User = { id: string; name: string; email: string; role: 'ADMIN' | 'AGENT'; createdAt: string }

function UsersPage() {
  const { data: users = [], isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<{ users: User[] }>('/api/users').then((res) => res.data.users),
  })

  const errorMessage = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.error ?? error.message)
      : 'Failed to load users'
    : null

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Users</h1>

      {errorMessage && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      {!errorMessage && isPending && (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!errorMessage && !isPending && users.length === 0 && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No users found.</p>
      )}
      {!errorMessage && !isPending && users.length > 0 && (
        <Table className="mt-6">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
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
                      user.role === 'ADMIN'
                        ? 'font-medium text-purple-600 dark:text-purple-400'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }
                  >
                    {user.role}
                  </span>
                </TableCell>
                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}

export default UsersPage
