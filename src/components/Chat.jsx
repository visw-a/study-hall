import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { ItemEditor } from './ItemEditor.jsx'

export function Chat() {
  const { chat, items, settings, chatLoading, askClaude, saveMessageToLibrary, clearChat } = useStore()
  const [draft, setDraft] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [chat, chatLoading])

  function send() {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    askClaude(text)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) : null

  return (
    <aside className="chat-sidebar">
      <div className="chat-header">
        <h2>Claude</h2>
        <div className="chat-header-right">
          {!settings.apiKey && <span className="offline-pill" title="No API key set — replies are offline mocks">offline</span>}
          {chat.length > 0 && (
            <button className="btn-link" onClick={() => window.confirm('Clear chat history?') && clearChat()}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="chat-messages" ref={listRef}>
        {chat.length === 0 && (
          <p className="chat-empty">
            Ask about what you're learning, or have Claude help organize your notes. Nothing here is saved to
            your library unless you click “Save to library” on a reply.
          </p>
        )}
        {chat.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onSave={() => {
              const item = saveMessageToLibrary(message.id)
              if (item) setEditingItemId(item.id)
            }}
          />
        ))}
        {chatLoading && (
          <div className="chat-bubble chat-bubble-assistant chat-thinking">
            <span className="dot" /><span className="dot" /><span className="dot" />
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask Claude… (Enter to send, Shift+Enter for newline)"
          rows={2}
        />
        <button className="btn-primary" onClick={send} disabled={!draft.trim() || chatLoading}>
          Send
        </button>
      </div>

      <ItemEditor item={editingItem} onClose={() => setEditingItemId(null)} />
    </aside>
  )
}

function ChatBubble({ message, onSave }) {
  const isUser = message.role === 'user'
  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
      <div className="chat-bubble-text">{message.content}</div>
      {!isUser && (
        message.savedItemId ? (
          <span className="chat-saved-pill">✓ Saved to library</span>
        ) : (
          <button className="btn-link chat-save-btn" onClick={onSave}>Save to library</button>
        )
      )}
    </div>
  )
}
