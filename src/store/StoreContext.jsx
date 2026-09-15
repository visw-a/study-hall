import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { store, newId } from '../lib/storage.js'
import { suggestTopic, suggestTags } from '../lib/categorize.js'
import { streamChat, DEFAULT_MODEL } from '../lib/claude.js'

const StoreContext = createContext(null)

// Kept within the app's black/white/navy palette: alternating navy and
// gray shades so topics stay visually distinct without adding new hues.
const TOPIC_COLORS = ['#17284f', '#3d3f47', '#3b5b8c', '#6a6d78', '#5c7cad', '#9497a2', '#7d9dc9', '#c1c3ca']

export function StoreProvider({ children }) {
  const [items, setItems] = useState(() => store.getItems())
  const [topics, setTopics] = useState(() => store.getTopics())
  const [chat, setChat] = useState(() => store.getChat())
  const [settings, setSettings] = useState(() => store.getSettings())
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)

  useEffect(() => { store.setItems(items) }, [items])
  useEffect(() => { store.setTopics(topics) }, [topics])
  useEffect(() => { store.setChat(chat) }, [chat])
  useEffect(() => { store.setSettings(settings) }, [settings])

  // Items with the archived ones hidden — what every view/search/count
  // should use unless it's specifically showing the archive.
  const activeItems = useMemo(() => items.filter((it) => !it.archived), [items])

  // ---- Items -----------------------------------------------------------

  const addItem = useCallback((input) => {
    const now = Date.now()
    const text = `${input.title || ''} ${input.content || ''}`
    let topicId = input.topicId
    let autoFiled = false
    if (!topicId) {
      const suggestion = suggestTopic(text, store.getTopics(), store.getItems().filter((it) => !it.archived))
      topicId = suggestion.topicId || 'unsorted'
      autoFiled = Boolean(suggestion.topicId)
    }
    const item = {
      id: newId('item'),
      type: input.type || 'note',
      title: input.title?.trim() || 'Untitled',
      content: input.content || '',
      question: input.question || null,
      topicId,
      tags: input.tags && input.tags.length ? input.tags : suggestTags(text),
      autoFiled,
      // Only meaningful for type 'todo'; harmless on other kinds.
      done: input.type === 'todo' ? Boolean(input.done) : undefined,
      dueAt: input.type === 'todo' ? input.dueAt || null : undefined,
      notifiedAt: null,
      archived: false,
      createdAt: now,
      updatedAt: now,
    }
    setItems((prev) => [item, ...prev])
    return item
  }, [])

  const toggleTodo = useCallback((id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done, updatedAt: Date.now() } : it))
    )
  }, [])

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it))
    )
  }, [])

  // Archiving is the default, reversible way to get an item out of view —
  // "Delete" (below) is the separate, permanent action, only reachable from
  // the Archived list so it's never one accidental click away.
  const archiveItem = useCallback((id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, archived: true, updatedAt: Date.now() } : it)))
  }, [])

  const restoreItem = useCallback((id) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, archived: false, updatedAt: Date.now() } : it)))
  }, [])

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }, [])

  // ---- Due-date reminders ------------------------------------------------
  //
  // Best-effort only: this is a static, backend-less app, so a reminder can
  // only fire while this tab is open (via the Notification API) — there's
  // no server to push a notification after the tab or browser is closed.
  // Checked every 30s; each overdue to-do notifies once (`notifiedAt`).

  const [reminderPermission, setReminderPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  )

  const requestReminderPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported'
    const result = await Notification.requestPermission()
    setReminderPermission(result)
    return result
  }, [])

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    const check = () => {
      if (Notification.permission !== 'granted') return
      const now = Date.now()
      setItems((prev) => {
        let changed = false
        const next = prev.map((it) => {
          if (it.type === 'todo' && !it.done && !it.archived && it.dueAt && it.dueAt <= now && !it.notifiedAt) {
            changed = true
            try {
              new Notification('Study Hall — to-do due', { body: it.title, tag: it.id })
            } catch {
              // Notification construction can fail (e.g. unsupported in this
              // context) — the due-date UI elsewhere still shows it as overdue.
            }
            return { ...it, notifiedAt: now }
          }
          return it
        })
        return changed ? next : prev
      })
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  // ---- Topics ------------------------------------------------------------

  const addTopic = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const topic = {
      id: newId('topic'),
      name: trimmed,
      color: TOPIC_COLORS[topics.length % TOPIC_COLORS.length],
    }
    setTopics((prev) => [...prev, topic])
    return topic
  }, [topics.length])

  const updateTopic = useCallback((id, patch) => {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTopic = useCallback((id) => {
    if (id === 'unsorted') return
    setTopics((prev) => prev.filter((t) => t.id !== id))
    setItems((prev) => prev.map((it) => (it.topicId === id ? { ...it, topicId: 'unsorted' } : it)))
  }, [])

  // ---- Chat ----------------------------------------------------------

  const addChatMessage = useCallback((role, content) => {
    const message = { id: newId('msg'), role, content, createdAt: Date.now(), savedItemId: null }
    setChat((prev) => [...prev, message])
    return message
  }, [])

  const updateChatMessage = useCallback((id, patch) => {
    setChat((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }, [])

  const saveMessageToLibrary = useCallback((messageId, overrides = {}) => {
    const message = chat.find((m) => m.id === messageId)
    if (!message) return null
    const idx = chat.findIndex((m) => m.id === messageId)
    const precedingUser = [...chat.slice(0, idx)].reverse().find((m) => m.role === 'user')

    const suggestion = suggestTopic(message.content, topics, activeItems)
    const item = addItem({
      type: 'answer',
      title: overrides.title || (precedingUser ? truncateTitle(precedingUser.content) : 'Saved answer'),
      content: message.content,
      question: precedingUser?.content || null,
      topicId: overrides.topicId || suggestion.topicId || 'unsorted',
      tags: overrides.tags,
    })
    updateChatMessage(messageId, { savedItemId: item.id })
    return item
  }, [chat, topics, activeItems, addItem, updateChatMessage])

  const askClaude = useCallback(async (promptText) => {
    const trimmed = promptText.trim()
    if (!trimmed || chatLoading) return

    // Build history from the current in-memory `chat` plus the message we're
    // about to add — NOT from store.getChat(). Persistence happens in a
    // useEffect, which hasn't run yet at this point in the same tick, so
    // reading it back from localStorage here would silently return last
    // render's chat (missing the message we just sent).
    const userMessage = addChatMessage('user', trimmed)
    // A placeholder bubble that fills in live as tokens stream in, rather
    // than waiting for the whole reply — a real API call can take several
    // seconds, and a blank sidebar until then feels broken.
    const assistantMessage = addChatMessage('assistant', '')
    setChatLoading(true)
    setChatError(null)
    try {
      const history = [...chat, userMessage].map((m) => ({ role: m.role, content: m.content }))
      await streamChat(history, settings, activeItems, (textSoFar) => {
        updateChatMessage(assistantMessage.id, { content: textSoFar })
      })
    } catch (err) {
      setChatError(err.message || String(err))
      updateChatMessage(assistantMessage.id, { content: `_Something went wrong talking to Claude: ${err.message || err}_` })
    } finally {
      setChatLoading(false)
    }
  }, [chatLoading, addChatMessage, updateChatMessage, chat, settings, activeItems])

  const clearChat = useCallback(() => setChat([]), [])

  // ---- Settings --------------------------------------------------------

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // ---- Import / export ---------------------------------------------------

  const exportData = useCallback(() => store.exportAll(), [])

  const importData = useCallback((snapshot) => {
    store.importAll(snapshot)
    setItems(store.getItems())
    setTopics(store.getTopics())
    setChat(store.getChat())
    setSettings(store.getSettings())
  }, [])

  const value = useMemo(() => ({
    items, activeItems, topics, chat, settings, chatLoading, chatError,
    reminderPermission, requestReminderPermission,
    addItem, updateItem, deleteItem, archiveItem, restoreItem, toggleTodo,
    addTopic, updateTopic, deleteTopic,
    addChatMessage, updateChatMessage, saveMessageToLibrary,
    askClaude, clearChat,
    updateSettings,
    exportData, importData,
  }), [items, activeItems, topics, chat, settings, chatLoading, chatError,
      reminderPermission, requestReminderPermission,
      addItem, updateItem, deleteItem, archiveItem, restoreItem, toggleTodo,
      addTopic, updateTopic, deleteTopic, addChatMessage, updateChatMessage,
      saveMessageToLibrary, askClaude, clearChat, updateSettings, exportData, importData])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

function truncateTitle(text, max = 60) {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}
