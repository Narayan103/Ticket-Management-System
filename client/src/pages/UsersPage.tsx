import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type User = { id: string; name: string; email: string; role: 'ADMIN' | 'AGENT'; createdAt: string }

function UsersPage() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
    fetch(`${apiUrl}/api/users`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error ?? `Request failed with status ${res.status}`)
        }
        return res.json() as Promise<{ users: User[] }>
      })
      .then((data) => setUsers(data.users))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Users</h1>

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!error && users === null && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Loading users…</p>
      )}
      {!error && users !== null && users.length === 0 && (
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No users found.</p>
      )}
      {!error && users !== null && users.length > 0 && (
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
