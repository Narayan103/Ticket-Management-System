import axios from 'axios'

export function getErrorMessage(error: unknown, fallback: string): string | null {
  if (!error) return null
  return axios.isAxiosError(error) ? (error.response?.data?.error ?? error.message) : fallback
}
