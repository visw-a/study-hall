import { highlight } from '../lib/search.js'

function Highlighted({ text, query }) {
  const parts = highlight(text, query)
  if (typeof parts === 'string') return parts
  return parts.map((p) => (p.mark ? <mark key={p.key}>{p.text}</mark> : <span key={p.key}>{p.text}</span>))
}

export function ItemCard({ item, topic, query, onOpen }) {
  return (
    <button className="item-card" onClick={() => onOpen(item)}>
      <div className="item-card-top">
        <span className={`item-kind item-kind-${item.type}`}>{kindLabel(item)}</span>
        {topic && (
          <span className="item-topic" style={{ '--topic-color': topic.color }}>
            {topic.name}
          </span>
        )}
      </div>
      <h3 className={item.type === 'todo' && item.done ? 'item-title-done' : ''}>
        <Highlighted text={item.title} query={query} />
      </h3>
      {item.content && (
        <p className="item-preview">
          <Highlighted text={truncate(item.content, 180)} query={query} />
        </p>
      )}
      {item.tags?.length > 0 && (
        <div className="item-tags">
          {item.tags.map((tag) => (
            <span key={tag} className="tag-pill">#{tag}</span>
          ))}
        </div>
      )}
      <div className="item-date">{formatDate(item.updatedAt)}</div>
    </button>
  )
}

export function kindLabel(item) {
  if (item.type === 'answer') return 'Claude'
  if (item.type === 'todo') return item.done ? 'To-do · Done' : 'To-do'
  return 'Note'
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
