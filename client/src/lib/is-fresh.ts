const FRESH_WINDOW_MS = 5 * 60_000

export function isFresh(createdAt: string, updatedAt: string) {
  const lastActivity = Math.max(new Date(createdAt).getTime(), new Date(updatedAt).getTime())
  return Date.now() - lastActivity < FRESH_WINDOW_MS
}
