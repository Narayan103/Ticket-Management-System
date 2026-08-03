import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import EditUserForm from '@/components/EditUserForm'
import type { User } from '@/components/UsersTable'

type EditUserModalProps = { user: User | null; onOpenChange: (open: boolean) => void }

function EditUserModal({ user, onOpenChange }: EditUserModalProps) {
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update this user's details.</DialogDescription>
        </DialogHeader>
        {user && <EditUserForm key={user.id} user={user} open={true} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export default EditUserModal
