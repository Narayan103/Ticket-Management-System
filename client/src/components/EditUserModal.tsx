import FormModal from '@/components/FormModal'
import EditUserForm from '@/components/EditUserForm'
import type { User } from '@/components/UsersTable'

type EditUserModalProps = { user: User | null; onOpenChange: (open: boolean) => void }

function EditUserModal({ user, onOpenChange }: EditUserModalProps) {
  return (
    <FormModal open={user !== null} onOpenChange={onOpenChange} title="Edit User" description="Update this user's details.">
      {user && <EditUserForm key={user.id} user={user} open={true} onOpenChange={onOpenChange} />}
    </FormModal>
  )
}

export default EditUserModal
