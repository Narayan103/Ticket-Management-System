import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import UsersTable, { type User } from '@/components/UsersTable'

function UsersPage() {
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Users</h1>
        <Button onClick={() => setCreateUserOpen(true)}>Create User</Button>
      </div>

      {errorMessage && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>}
      {!errorMessage && <UsersTable users={users} isPending={isPending} onEditUser={setEditingUser} />}
      <CreateUserModal open={createUserOpen} onOpenChange={setCreateUserOpen} />
      <EditUserModal user={editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }} />
    </main>
  )
}

export default UsersPage
