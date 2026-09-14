import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { store, newId } from '../lib/storage.js'
import { suggestTopic, suggestTags } from '../lib/categorize.js'
import { sendChat } from '../lib/claude.js'

const StoreContext = createContext(null)

const TOPIC_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#14b8a6', '#f43f5e']

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

  // ---- Items -----------------------------------------------------------

  const addItem = useCallback((input) => {
    const now = Date.now()
    const text = `${input.title || ''} ${input.content || ''}`
    let topicId = input.topicId
    let autoFiled = false
    if (!topicId) {
      const suggestion = suggestTopic(text, store.getTopics(), store.getItems())
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
      createdAt: now,
      updatedAt: now,
    }
    setItems((prev) => [item, ...prev])
    return item
  }, [])

  const updateItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch, updatedAt: Date.now() } : it))
    )
  }, [])

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
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

    const suggestion = suggestTopic(message.content, topics, items)
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
  }, [chat, addItem, updateChatMessage])

  const askClaude = useCallback(async (promptText) => {
    const trimmed = promptText.trim()
    if (!trimmed || chatLoading) return

    // Build history from the current in-memory `chat` plus the message we're
    // about to add — NOT from store.getChat(). Persistence happens in a
    // useEffect, which hasn't run yet at this point in the same tick, so
    // reading it back from localStorage here would silently return last
    // render's chat (missing the message we just sent).
    const userMessage = addChatMessage('user', trimmed)
    setChatLoading(true)
    setChatError(null)
    try {
      const history = [...chat, userMessage].map((m) => ({ role: m.role, content: m.content }))
      const reply = await sendChat(history, settings, items)
      addChatMessage('assistant', reply)
    } catch (err) {
      setChatError(err.message || String(err))
      addChatMessage('assistant', `_Something went wrong talking to Claude: ${err.message || err}_`)
    } finally {
      setChatLoading(false)
    }
  }, [chatLoading, addChatMessage, chat, settings, items])

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
    items, topics, chat, settings, chatLoading, chatError,
    addItem, updateItem, deleteItem,
    addTopic, updateTopic, deleteTopic,
    addChatMessage, updateChatMessage, saveMessageToLibrary,
    askClaude, clearChat,
    updateSettings,
    exportData, importData,
  }), [items, topics, chat, settings, chatLoading, chatError, addItem, updateItem, deleteItem,
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
