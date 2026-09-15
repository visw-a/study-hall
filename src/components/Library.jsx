import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { searchItems } from '../lib/search.js'
import { QuickCapture } from './QuickCapture.jsx'
import { ItemCard } from './ItemCard.jsx'
import { ItemEditor } from './ItemEditor.jsx'

export function Library() {
  const { items, activeItems, topics } = useStore()
  const [query, setQuery] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [openItem, setOpenItem] = useState(null)

  const topicById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])
  const archivedCount = useMemo(() => items.filter((it) => it.archived).length, [items])
  const source = showArchived ? items.filter((it) => it.archived) : activeItems

  const filtered = useMemo(() => {
    let ranked = query.trim() ? searchItems(source, query) : source.map((item) => ({ item, score: 0 }))
    if (topicFilter !== 'all') ranked = ranked.filter((r) => r.item.topicId === topicFilter)
    if (kindFilter !== 'all') ranked = ranked.filter((r) => r.item.type === kindFilter)
    if (!query.trim()) ranked = [...ranked].sort((a, b) => b.item.updatedAt - a.item.updatedAt)
    return ranked
  }, [source, query, topicFilter, kindFilter])

  return (
    <div className="view library-view">
      <div className="view-header-row">
        <h1>Library</h1>
        {(archivedCount > 0 || showArchived) && (
          <button
            className={`btn-secondary btn-small${showArchived ? ' active' : ''}`}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? '← Back to Library' : `Archived (${archivedCount})`}
          </button>
        )}
      </div>

      {!showArchived && <QuickCapture />}

      <div className="library-controls">
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={showArchived ? 'Search archived items…' : 'Search your notes and saved answers…'}
        />
        <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
          <option value="all">All kinds</option>
          <option value="note">Notes</option>
          <option value="todo">To-dos</option>
          <option value="answer">Saved answers</option>
        </select>
      </div>

      <div className="library-count">
        {filtered.length} item{filtered.length === 1 ? '' : 's'}
        {query.trim() && ` matching “${query.trim()}”`}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          {showArchived
            ? 'Nothing archived.'
            : items.length === 0
              ? 'Nothing here yet — capture a thought above to get started.'
              : 'No items match your filters.'}
        </div>
      ) : (
        <div className="item-grid">
          {filtered.map(({ item }) => (
            <ItemCard
              key={item.id}
              item={item}
              topic={topicById[item.topicId]}
              query={query}
              onOpen={setOpenItem}
            />
          ))}
        </div>
      )}

      <ItemEditor item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
