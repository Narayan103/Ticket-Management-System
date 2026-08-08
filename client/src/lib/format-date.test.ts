import { describe, it, expect } from 'vitest'
import { formatDateTime, formatDate } from './format-date'

describe('formatDateTime', () => {
  it('formats a date with a short date style by default', () => {
    const result = formatDateTime('2024-01-15T10:30:00.000Z')
    expect(result).toBe(new Date('2024-01-15T10:30:00.000Z').toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }))
  })

  it('formats a date with the given date style', () => {
    const result = formatDateTime('2024-01-15T10:30:00.000Z', 'medium')
    expect(result).toBe(new Date('2024-01-15T10:30:00.000Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
  })
})

describe('formatDate', () => {
  it('formats a date without a time component', () => {
    const result = formatDate('2024-01-15T10:30:00.000Z')
    expect(result).toBe(new Date('2024-01-15T10:30:00.000Z').toLocaleDateString())
  })
})
