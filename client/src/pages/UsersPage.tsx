import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/get-error-message'
import { Button } from '@/components/ui/button'
import CreateUserModal from '@/components/CreateUserModal'
import EditUserModal from '@/components/EditUserModal'
import DeleteUserModal from '@/components/DeleteUserModal'
import UsersTable, { type User } from '@/components/UsersTable'
import ErrorMessage from '@/components/ErrorMessage'

function UsersPage() {
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const { data: users = [], isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<{ users: User[] }>('/api/users').then((res) => res.data.users),
  })

  const errorMessage = getErrorMessage(error, 'Failed to load users')

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">Users</h1>
        <Button onClick={() => setCreateUserOpen(true)}>Create User</Button>
      </div>

      <ErrorMessage message={errorMessage} />
      {!errorMessage && (
        <UsersTable users={users} isPending={isPending} onEditUser={setEditingUser} onDeleteUser={setDeletingUser} />
      )}
      <CreateUserModal open={createUserOpen} onOpenChange={setCreateUserOpen} />
      <EditUserModal user={editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null) }} />
      <DeleteUserModal user={deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null) }} />
    </main>
  )
}

export default UsersPage
