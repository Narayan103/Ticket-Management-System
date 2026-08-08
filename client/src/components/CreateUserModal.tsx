import FormModal from '@/components/FormModal'
import CreateUserForm from '@/components/CreateUserForm'

type CreateUserModalProps = { open: boolean; onOpenChange: (open: boolean) => void }

function CreateUserModal({ open, onOpenChange }: CreateUserModalProps) {
  return (
    <FormModal open={open} onOpenChange={onOpenChange} title="Create User" description="Add a new agent to the system.">
      <CreateUserForm open={open} onOpenChange={onOpenChange} />
    </FormModal>
  )
}

export default CreateUserModal
