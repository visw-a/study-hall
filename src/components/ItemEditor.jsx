import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'

// Renders nothing while closed — an earlier version of this component
// dereferenced `item` on first render even when null, which blanked the
// whole page. Guard stays explicit here as a reminder of why.
export function ItemEditor({ item, onClose }) {
  const { topics, updateItem, deleteItem, askClaude } = useStore()
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    if (item) {
      setDraft({
        title: item.title,
        content: item.content,
        topicId: item.topicId,
        tags: (item.tags || []).join(', '),
        done: Boolean(item.done),
      })
    } else {
      setDraft(null)
    }
  }, [item])

  if (!item || !draft) return null

  function save() {
    updateItem(item.id, {
      title: draft.title.trim() || 'Untitled',
      content: draft.content,
      topicId: draft.topicId,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ...(item.type === 'todo' ? { done: draft.done } : {}),
    })
    onClose()
  }

  function remove() {
    if (window.confirm('Delete this item? This cannot be undone.')) {
      deleteItem(item.id)
      onClose()
    }
  }

  function askAboutThis() {
    const label = item.type === 'todo' ? 'to-do' : item.type === 'answer' ? 'saved answer' : 'note'
    const body = item.content ? `\n\n${item.content}` : ''
    askClaude(`About this ${label} — "${item.title}":${body}\n\nCan you help me go deeper on this?`)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className={`item-kind item-kind-${item.type}`}>{headerLabel(item.type)}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {item.question && (
          <div className="item-editor-question">
            <strong>Question asked:</strong> {item.question}
          </div>
        )}

        {item.type === 'todo' && (
          <label className="item-editor-done">
            <input
              type="checkbox"
              checked={draft.done}
              onChange={(e) => setDraft({ ...draft, done: e.target.checked })}
            />
            Done
          </label>
        )}

        <input
          className="item-editor-title"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title"
        />

        <textarea
          className="item-editor-content"
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          rows={10}
        />

        <div className="item-editor-row">
          <label>
            Topic
            <select value={draft.topicId} onChange={(e) => setDraft({ ...draft, topicId: e.target.value })}>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="item-editor-tags">
            Tags (comma separated)
            <input
              value={draft.tags}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              placeholder="react, hooks, performance"
            />
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={remove}>Delete</button>
          {item.type !== 'answer' && (
            <button className="btn-secondary" onClick={askAboutThis}>Ask Claude about this</button>
          )}
          <div className="modal-footer-spacer" />
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  )
}

function headerLabel(type) {
  if (type === 'answer') return 'Saved Claude answer'
  if (type === 'todo') return 'To-do'
  return 'Note'
}
