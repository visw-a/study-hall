import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { searchItems } from '../lib/search.js'
import { ItemEditor } from './ItemEditor.jsx'
import { kindLabel } from './ItemCard.jsx'
import { VIEWS } from '../registry.js'

// Cmd/Ctrl+K anywhere in the app: jump straight to a view or to any item by
// title/content/tag, without clicking through nav + search + filters.
export function CommandPalette({ onNavigate }) {
  const { items, topics } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [openItem, setOpenItem] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const topicById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  const viewResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VIEWS.filter((v) => !q || v.label.toLowerCase().includes(q))
  }, [query])

  const itemResults = useMemo(() => {
    if (!query.trim()) return items.slice(0, 6).sort((a, b) => b.updatedAt - a.updatedAt)
    return searchItems(items, query).slice(0, 8).map((r) => r.item)
  }, [items, query])

  const results = useMemo(
    () => [
      ...viewResults.map((v) => ({ kind: 'view', view: v })),
      ...itemResults.map((it) => ({ kind: 'item', item: it })),
    ],
    [viewResults, itemResults]
  )

  useEffect(() => setSelected(0), [query])

  function activate(result) {
    if (!result) return
    if (result.kind === 'view') {
      onNavigate(result.view.id)
    } else {
      setOpenItem(result.item)
    }
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      activate(results[selected])
    }
  }

  if (!open) {
    return <ItemEditor item={openItem} onClose={() => setOpenItem(null)} />
  }

  return (
    <div className="palette-backdrop" onClick={() => setOpen(false)}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Jump to a view, or search notes, to-dos and saved answers…"
        />
        <div className="palette-results">
          {results.length === 0 && <div className="palette-empty">No matches.</div>}
          {results.map((result, i) => (
            <button
              key={result.kind === 'view' ? `view-${result.view.id}` : `item-${result.item.id}`}
              className={`palette-row${i === selected ? ' selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => activate(result)}
            >
              {result.kind === 'view' ? (
                <>
                  <span className="palette-row-icon">{result.view.icon}</span>
                  <span>{result.view.label}</span>
                  <span className="palette-row-hint">Go to</span>
                </>
              ) : (
                <>
                  <span className="palette-row-kind">{kindLabel(result.item)}</span>
                  <span className="palette-row-title">{result.item.title}</span>
                  <span className="palette-row-hint">{topicById[result.item.topicId]?.name}</span>
                </>
              )}
            </button>
          ))}
        </div>
        <div className="palette-footer">↑↓ to navigate · Enter to select · Esc to close</div>
      </div>
      <ItemEditor item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
