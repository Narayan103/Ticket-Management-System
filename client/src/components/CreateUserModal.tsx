import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import CreateUserForm from '@/components/CreateUserForm'

type CreateUserModalProps = { open: boolean; onOpenChange: (open: boolean) => void }

function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Add a new agent to the system.</DialogDescription>
        </DialogHeader>
        <CreateUserForm open={open} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  )
}

export default CreateUserModal
