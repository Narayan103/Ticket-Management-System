type ErrorMessageProps = { message: string | null }

function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null
  return <p className="mt-4 text-sm text-destructive">{message}</p>
}

export default ErrorMessage
