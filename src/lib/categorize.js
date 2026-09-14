// Auto-categorization: suggest which topic a new note belongs to by
// comparing its words against the words already filed under each topic.
// Deliberately simple (bag-of-words + light stemming) so it's predictable
// and has no external dependency — and it refuses to guess when nothing
// is a confident match, leaving the note in Unsorted instead.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'about',
  'as', 'by', 'that', 'this', 'it', 'its', 'i', 'you', 'we', 'they',
  'my', 'your', 'our', 'their', 'from', 'not', 'no', 'so', 'do', 'does',
  'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should',
  'just', 'if', 'then', 'than', 'what', 'when', 'where', 'how', 'why',
  'up', 'out', 'into', 'over', 'again',
])

// Light stemming so "memoizing"/"memoized"/"memoize" collapse to one
// token, without pulling in a real stemmer library.
function stem(word) {
  let w = word
  if (w.length > 6 && w.endsWith('ing')) w = w.slice(0, -3)
  else if (w.length > 5 && w.endsWith('ies')) w = w.slice(0, -3) + 'y'
  else if (w.length > 5 && w.endsWith('ied')) w = w.slice(0, -3) + 'y'
  else if (w.length > 5 && w.endsWith('ed')) w = w.slice(0, -2)
  else if (w.length > 4 && w.endsWith('es')) w = w.slice(0, -2)
  else if (w.length > 4 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)

  // Drop a trailing silent "e" (e.g. "memoize" -> "memoiz") so it lines
  // up with the "ing"-stripped form of the same word ("memoizing" ->
  // "memoiz") — otherwise the two spellings of one concept would never
  // match each other.
  if (w.length > 4 && w.endsWith('e') && !w.endsWith('ee')) w = w.slice(0, -1)

  return w
}

// Exposed separately from tokenize() so callers (like search highlighting)
// can stem one raw word at a time without the stopword filtering tokenize
// applies to whole documents.
export function stemWord(word) {
  return stem((word || '').toLowerCase())
}

function cleanWords(text) {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

export function tokenize(text) {
  return cleanWords(text).map(stem)
}

function wordSet(text) {
  return new Set(tokenize(text))
}

// Confidence threshold: the suggestion needs at least this much overlap
// with a topic's existing vocabulary before we'll trust it. Below this,
// return null (Unsorted) rather than risk a wrong filing.
const MIN_SCORE = 0.12
const MIN_OVERLAP_WORDS = 2

/**
 * Suggest a topic for a note.
 * @param {string} text - the note's title + content
 * @param {Array<{id,name}>} topics
 * @param {Array<{id,topicId,title,content}>} items - existing library items
 * @returns {{topicId: string|null, score: number, matches: Record<string, number>}}
 */
export function suggestTopic(text, topics, items) {
  const noteWords = wordSet(text)
  const matches = {}

  if (noteWords.size === 0) {
    return { topicId: null, score: 0, matches }
  }

  const candidateTopics = topics.filter((t) => t.id !== 'unsorted')

  let best = { topicId: null, score: 0 }

  for (const topic of candidateTopics) {
    const topicItems = items.filter((it) => it.topicId === topic.id)
    if (topicItems.length === 0) continue

    // Union of vocabulary already filed under this topic.
    const topicWords = new Set()
    for (const it of topicItems) {
      for (const w of tokenize(`${it.title || ''} ${it.content || ''}`)) {
        topicWords.add(w)
      }
    }
    if (topicWords.size === 0) continue

    let overlap = 0
    for (const w of noteWords) {
      if (topicWords.has(w)) overlap++
    }

    // Score = overlap relative to the note's own vocabulary size, so a
    // short note isn't unfairly penalized against a topic with lots of
    // accumulated words.
    const score = overlap / noteWords.size
    matches[topic.id] = score

    if (overlap >= MIN_OVERLAP_WORDS && score > best.score) {
      best = { topicId: topic.id, score }
    }
  }

  if (best.score >= MIN_SCORE && best.topicId) {
    return { topicId: best.topicId, score: best.score, matches }
  }
  return { topicId: null, score: best.score, matches }
}

/**
 * Suggest free-form tags for a note: its most distinctive words, deduped
 * by stem (so "memoize" and "memoizing" count as one tag) but displayed
 * using a real surface form rather than the internal stemmed token.
 */
export function suggestTags(text, max = 4) {
  const freq = new Map() // stem -> { count, word }
  for (const w of cleanWords(text)) {
    const s = stem(w)
    const entry = freq.get(s)
    if (entry) {
      entry.count++
      if (w.length < entry.word.length) entry.word = w
    } else {
      freq.set(s, { count: 1, word: w })
    }
  }
  return [...freq.values()]
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, max)
    .map((v) => v.word)
}
