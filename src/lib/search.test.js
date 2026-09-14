import { describe, it, expect } from 'vitest'
import { searchItems, highlight } from './search.js'

const items = [
  { id: '1', title: 'useMemo basics', content: 'memoizing expensive renders', tags: ['react', 'hooks'], updatedAt: 3 },
  { id: '2', title: 'Bread dough', content: 'kneading dough with yeast', tags: ['cooking'], updatedAt: 2 },
  { id: '3', title: 'React performance notes', content: 'memoizing and rendering cost', tags: ['react'], updatedAt: 1 },
]

describe('searchItems', () => {
  it('returns everything unscored for an empty query', () => {
    const results = searchItems(items, '')
    expect(results.length).toBe(items.length)
    expect(results.every((r) => r.score === 0)).toBe(true)
  })

  it('ranks title matches above content-only matches', () => {
    const results = searchItems(items, 'react')
    const ids = results.map((r) => r.item.id)
    // item 3 has "React" in the title, item 1 only has it as a tag.
    expect(ids[0]).toBe('3')
    expect(ids).toContain('1')
  })

  it('matches on stemmed word forms', () => {
    const results = searchItems(items, 'memoize')
    const ids = results.map((r) => r.item.id)
    expect(ids).toContain('1') // "memoizing"
    expect(ids).toContain('3') // "memoization"
  })

  it('excludes items with no match at all', () => {
    const results = searchItems(items, 'react')
    expect(results.find((r) => r.item.id === '2')).toBeUndefined()
  })

  it('returns an empty array when the query has no meaningful words', () => {
    expect(searchItems(items, 'the a an')).toEqual([])
  })
})

describe('highlight', () => {
  it('splits text into marked/unmarked segments around query matches', () => {
    const parts = highlight('React hooks are great', 'hooks')
    expect(Array.isArray(parts)).toBe(true)
    const marked = parts.filter((p) => p.mark).map((p) => p.text.toLowerCase())
    expect(marked).toContain('hooks')
  })

  it('returns the original text unchanged when the query is empty', () => {
    expect(highlight('React hooks', '')).toBe('React hooks')
  })
})
