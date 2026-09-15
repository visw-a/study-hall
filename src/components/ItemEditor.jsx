import { useEffect, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { NoteComposer } from './NoteComposer.jsx'

// Renders nothing while closed — an earlier version of this component
// dereferenced `item` on first render even when null, which blanked the
// whole page. Guard stays explicit here as a reminder of why.
export function ItemEditor({ item, onClose }) {
  const { topics, updateItem, deleteItem, archiveItem, restoreItem, askClaude } = useStore()
  const [draft, setDraft] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (item) {
      setDraft({
        title: item.title,
        content: item.content,
        topicId: item.topicId,
        tags: (item.tags || []).join(', '),
        done: Boolean(item.done),
        dueAt: item.dueAt || null,
      })
    } else {
      setDraft(null)
    }
    setExpanded(false)
  }, [item])

  if (!item || !draft) return null

  function save() {
    updateItem(item.id, {
      title: draft.title.trim() || 'Untitled',
      content: draft.content,
      topicId: draft.topicId,
      tags: draft.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ...(item.type === 'todo' ? { done: draft.done, dueAt: draft.dueAt } : {}),
    })
    onClose()
  }

  function archive() {
    archiveItem(item.id)
    onClose()
  }

  function restore() {
    restoreItem(item.id)
    onClose()
  }

  function removePermanently() {
    if (window.confirm('Delete this item permanently? This cannot be undone.')) {
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

  function askToCategorize() {
    const topicNames = topics.filter((t) => t.id !== 'unsorted').map((t) => t.name)
    const body = draft.content ? `\n\n${draft.content}` : ''
    const list = topicNames.length ? topicNames.join(', ') : '(no topics yet — suggest a new one)'
    askClaude(
      `Which topic should this go under — "${draft.title}"?${body}\n\nMy existing topics: ${list}.\n\n` +
      `Recommend one (or a new topic name if none fit), in one short sentence.`
    )
  }

  if (expanded) {
    return (
      <NoteComposer
        title={draft.title}
        onTitleChange={(v) => setDraft({ ...draft, title: v })}
        content={draft.content}
        onContentChange={(v) => setDraft({ ...draft, content: v })}
        onClose={() => setExpanded(false)}
      />
    )
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className={`item-kind item-kind-${item.type}`}>{headerLabel(item.type)}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {item.archived && <div className="item-editor-archived-banner">Archived</div>}

        {item.question && (
          <div className="item-editor-question">
            <strong>Question asked:</strong> {item.question}
          </div>
        )}

        {item.type === 'todo' && (
          <div className="item-editor-todo-row">
            <label className="item-editor-done">
              <input
                type="checkbox"
                checked={draft.done}
                onChange={(e) => setDraft({ ...draft, done: e.target.checked })}
              />
              Done
            </label>
            <label className="item-editor-due">
              Due
              <input
                type="date"
                value={draft.dueAt ? toDateInputValue(draft.dueAt) : ''}
                onChange={(e) => setDraft({ ...draft, dueAt: e.target.value ? new Date(e.target.value).getTime() : null })}
              />
              {draft.dueAt && (
                <button type="button" className="btn-link" onClick={() => setDraft({ ...draft, dueAt: null })}>Clear</button>
              )}
            </label>
          </div>
        )}

        <div className="item-editor-title-row">
          <input
            className="item-editor-title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title"
          />
          <button type="button" className="btn-secondary btn-small" onClick={() => setExpanded(true)} title="Expand to a larger editor">
            ⤢ Expand
          </button>
        </div>

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

        {draft.topicId === 'unsorted' && (
          <button type="button" className="btn-link" onClick={askToCategorize}>Ask Claude to suggest a topic</button>
        )}

        <div className="modal-footer">
          {item.archived ? (
            <>
              <button className="btn-danger" onClick={removePermanently}>Delete permanently</button>
              <button className="btn-secondary" onClick={restore}>Restore</button>
            </>
          ) : (
            <button className="btn-secondary" onClick={archive}>Archive</button>
          )}
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

function toDateInputValue(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
