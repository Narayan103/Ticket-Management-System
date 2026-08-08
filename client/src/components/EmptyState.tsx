type EmptyStateProps = { message: string }

function EmptyState({ message }: EmptyStateProps) {
  return <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{message}</p>
}

export default EmptyState
