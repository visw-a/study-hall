// Ranked search over library items. Title matches score highest, then
// tags, then body content; an exact substring match scores a bonus on
// top of individual word matches. Returns items sorted best-first with
// `highlights` describing which fields matched, for the UI to bold.

import { tokenize, stemWord } from './categorize.js'

function fieldScore(fieldText, queryWords, rawQuery, weight) {
  if (!fieldText) return 0
  const lower = fieldText.toLowerCase()
  let score = 0

  if (rawQuery && lower.includes(rawQuery.toLowerCase())) {
    score += weight * 2
  }

  const fieldWords = new Set(tokenize(fieldText))
  for (const qw of queryWords) {
    if (fieldWords.has(qw)) score += weight
  }
  return score
}

export function searchItems(items, query) {
  const q = (query || '').trim()
  if (!q) return items.map((item) => ({ item, score: 0 }))

  const queryWords = tokenize(q)
  if (queryWords.length === 0) return []

  const results = []
  for (const item of items) {
    const titleScore = fieldScore(item.title, queryWords, q, 3)
    const tagScore = fieldScore((item.tags || []).join(' '), queryWords, q, 2)
    const contentScore = fieldScore(item.content, queryWords, q, 1)
    const questionScore = fieldScore(item.question, queryWords, q, 1)
    const score = titleScore + tagScore + contentScore + questionScore

    if (score > 0) {
      results.push({ item, score })
    }
  }

  results.sort((a, b) => b.score - a.score || (b.item.updatedAt || 0) - (a.item.updatedAt || 0))
  return results
}

/**
 * Split text into segments for highlighted display, marking whole words
 * whose stemmed form matches one of the query's stemmed words — so
 * searching "hook" highlights the complete word "hooks", not just the
 * "hook" substring inside it.
 */
export function highlight(text, query) {
  if (!text) return ''
  const queryStems = new Set(tokenize(query))
  if (queryStems.size === 0) return text

  return text.split(/(\b[a-zA-Z0-9]+\b)/g).map((part, i) => ({
    mark: /^[a-zA-Z0-9]+$/.test(part) && queryStems.has(stemWord(part)),
    text: part,
    key: i,
  }))
}
