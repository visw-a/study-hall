import { describe, it, expect } from 'vitest'
import { tokenize, suggestTopic, suggestTags } from './categorize.js'

describe('tokenize', () => {
  it('lowercases, strips punctuation, and drops stopwords', () => {
    expect(tokenize('The Quick, Brown Fox!')).toEqual(['quick', 'brown', 'fox'])
  })

  it('drops very short words and stopwords', () => {
    expect(tokenize('it is a big and small test')).toEqual(['big', 'small', 'test'])
  })

  it('stems common suffixes so related forms collapse', () => {
    expect(tokenize('memoizing memoized memoize')).toEqual(['memoiz', 'memoiz', 'memoiz'])
  })

  it('returns an empty array for empty input', () => {
    expect(tokenize('')).toEqual([])
    expect(tokenize(undefined)).toEqual([])
  })
})

describe('suggestTopic', () => {
  const topics = [
    { id: 'unsorted', name: 'Unsorted' },
    { id: 'react', name: 'React' },
    { id: 'cooking', name: 'Cooking' },
  ]

  const items = [
    { id: '1', topicId: 'react', title: 'useMemo basics', content: 'memoizing expensive renders with hooks and props' },
    { id: '2', topicId: 'react', title: 'useCallback', content: 'memoize callback functions passed as props to children' },
    { id: '3', topicId: 'cooking', title: 'Bread dough', content: 'kneading dough with yeast and flour and salt' },
  ]

  it('suggests the topic whose vocabulary overlaps most', () => {
    const result = suggestTopic('memoizing props in components with hooks', topics, items)
    expect(result.topicId).toBe('react')
  })

  it('never suggests the built-in unsorted topic', () => {
    const result = suggestTopic('memoizing props in components with hooks', topics, items)
    expect(result.topicId).not.toBe('unsorted')
  })

  it('returns null when nothing overlaps confidently', () => {
    const result = suggestTopic('a totally unrelated sentence about astronomy and planets', topics, items)
    expect(result.topicId).toBeNull()
  })

  it('returns null for empty text', () => {
    const result = suggestTopic('', topics, items)
    expect(result.topicId).toBeNull()
    expect(result.score).toBe(0)
  })

  it('ignores topics with no existing items', () => {
    const emptyTopics = [{ id: 'empty', name: 'Empty' }]
    const result = suggestTopic('memoizing props hooks', emptyTopics, [])
    expect(result.topicId).toBeNull()
  })
})

describe('suggestTags', () => {
  it('returns the most frequent distinctive words', () => {
    const tags = suggestTags('react hooks react hooks react state management', 2)
    expect(tags).toEqual(['react', 'hooks'])
  })

  it('dedupes by stem but displays a real word, not the internal stem', () => {
    const tags = suggestTags('memoizing memoizing memoize', 1)
    expect(tags).toEqual(['memoize'])
  })

  it('caps at the requested max', () => {
    const tags = suggestTags('alpha beta gamma delta epsilon zeta', 3)
    expect(tags.length).toBe(3)
  })
})
