import { describe, it, expect } from 'vitest'
import { describeDue } from './dates.js'

const DAY_MS = 24 * 60 * 60 * 1000

describe('describeDue', () => {
  it('returns null for no due date', () => {
    expect(describeDue(null)).toBeNull()
    expect(describeDue(undefined)).toBeNull()
  })

  it('labels today as "Today" and not overdue', () => {
    const result = describeDue(Date.now())
    expect(result.label).toBe('Today')
    expect(result.overdue).toBe(false)
    expect(result.dueSoon).toBe(true)
  })

  it('labels tomorrow as "Tomorrow" and not overdue', () => {
    const result = describeDue(Date.now() + DAY_MS)
    expect(result.label).toBe('Tomorrow')
    expect(result.overdue).toBe(false)
  })

  it('labels yesterday as overdue', () => {
    const result = describeDue(Date.now() - DAY_MS)
    expect(result.label).toBe('Yesterday (overdue)')
    expect(result.overdue).toBe(true)
  })

  it('marks anything before today as overdue', () => {
    const result = describeDue(Date.now() - 5 * DAY_MS)
    expect(result.overdue).toBe(true)
    expect(result.label).toContain('(overdue)')
  })

  it('marks a date 3+ days out as not "due soon"', () => {
    const result = describeDue(Date.now() + 5 * DAY_MS)
    expect(result.overdue).toBe(false)
    expect(result.dueSoon).toBe(false)
  })

  it('marks something 2 days out as "due soon"', () => {
    const result = describeDue(Date.now() + 2 * DAY_MS)
    expect(result.dueSoon).toBe(true)
  })
})
