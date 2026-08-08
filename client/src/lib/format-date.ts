export function formatDateTime(value: string, dateStyle: 'short' | 'medium' | 'long' = 'short') {
  return new Date(value).toLocaleString(undefined, { dateStyle, timeStyle: 'short' })
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}
