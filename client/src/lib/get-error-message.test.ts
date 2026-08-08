import { describe, it, expect } from 'vitest'
import { getErrorMessage } from './get-error-message'

describe('getErrorMessage', () => {
  it('returns null when there is no error', () => {
    expect(getErrorMessage(null, 'fallback')).toBeNull()
    expect(getErrorMessage(undefined, 'fallback')).toBeNull()
  })

  it('extracts the server error message from an axios error response', () => {
    const error = { isAxiosError: true, response: { data: { error: 'A user with this email already exists' } } }
    expect(getErrorMessage(error, 'fallback')).toBe('A user with this email already exists')
  })

  it('falls back to the axios error message when there is no response error', () => {
    const error = { isAxiosError: true, message: 'Network Error' }
    expect(getErrorMessage(error, 'fallback')).toBe('Network Error')
  })

  it('returns the fallback message for a non-axios error', () => {
    expect(getErrorMessage(new Error('boom'), 'Failed to load ticket')).toBe('Failed to load ticket')
  })
})
