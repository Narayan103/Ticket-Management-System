type ErrorMessageProps = { message: string | null }

function ErrorMessage({ message }: ErrorMessageProps) {
  if (!message) return null
  return <p className="mt-4 text-sm text-red-600 dark:text-red-400">{message}</p>
}

export default ErrorMessage
