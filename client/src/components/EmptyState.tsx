type EmptyStateProps = { message: string }

function EmptyState({ message }: EmptyStateProps) {
  return <p className="mt-4 text-sm text-muted-foreground">{message}</p>
}

export default EmptyState
