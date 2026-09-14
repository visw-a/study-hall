// All persistence for Study Hall lives in localStorage under this prefix.
// Bump the version segment if the shape of stored data ever changes in a
// way old data can't just be read as-is.
const PREFIX = 'studyhall.v1.'

const KEYS = {
  items: PREFIX + 'items',
  topics: PREFIX + 'topics',
  chat: PREFIX + 'chat',
  settings: PREFIX + 'settings',
}

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    // Corrupt or blocked storage should never take the app down.
    return fallback
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded or storage disabled (private browsing, etc).
    return false
  }
}

const DEFAULT_TOPICS = [
  { id: 'unsorted', name: 'Unsorted', color: '#94a3b8', builtin: true },
]

const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'claude-sonnet-5',
}

export const store = {
  getItems: () => read(KEYS.items, []),
  setItems: (items) => write(KEYS.items, items),

  getTopics: () => {
    const topics = read(KEYS.topics, null)
    if (!topics || topics.length === 0) {
      write(KEYS.topics, DEFAULT_TOPICS)
      return DEFAULT_TOPICS
    }
    return topics
  },
  setTopics: (topics) => write(KEYS.topics, topics),

  getChat: () => read(KEYS.chat, []),
  setChat: (chat) => write(KEYS.chat, chat),

  getSettings: () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }),
  setSettings: (settings) => write(KEYS.settings, settings),

  // Full snapshot for export/import so nothing is ever truly lost to a
  // browser wipe.
  exportAll: () => ({
    version: 1,
    exportedAt: new Date().toISOString(),
    items: read(KEYS.items, []),
    topics: read(KEYS.topics, DEFAULT_TOPICS),
    chat: read(KEYS.chat, []),
    settings: read(KEYS.settings, DEFAULT_SETTINGS),
  }),

  importAll: (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('That file does not look like a Study Hall export.')
    }
    if (Array.isArray(snapshot.items)) write(KEYS.items, snapshot.items)
    if (Array.isArray(snapshot.topics)) write(KEYS.topics, snapshot.topics)
    if (Array.isArray(snapshot.chat)) write(KEYS.chat, snapshot.chat)
    if (snapshot.settings) write(KEYS.settings, snapshot.settings)
  },
}

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
