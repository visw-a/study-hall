import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { ItemEditor } from './ItemEditor.jsx'

export function Todos() {
  const { items, topics, addItem, toggleTodo, deleteItem } = useStore()
  const [text, setText] = useState('')
  const [topicFilter, setTopicFilter] = useState('all')
  const [openItem, setOpenItem] = useState(null)

  const topicById = useMemo(() => Object.fromEntries(topics.map((t) => [t.id, t])), [topics])

  const todos = useMemo(() => {
    let list = items.filter((it) => it.type === 'todo')
    if (topicFilter !== 'all') list = list.filter((it) => it.topicId === topicFilter)
    return list
  }, [items, topicFilter])

  const open = todos.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt)
  const done = todos.filter((t) => t.done).sort((a, b) => b.updatedAt - a.updatedAt)

  function add() {
    const trimmed = text.trim()
    if (!trimmed) return
    addItem({ type: 'todo', title: trimmed, done: false })
    setText('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div className="view todos-view">
      <h1>To-Dos</h1>

      <div className="todo-add-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a to-do and press Enter…"
        />
        <button className="btn-primary" onClick={add} disabled={!text.trim()}>Add</button>
      </div>

      {topics.length > 1 && (
        <select className="todo-topic-filter" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
          <option value="all">All topics</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <section>
        <h2>Open ({open.length})</h2>
        {open.length === 0 ? (
          <p className="empty-state small">Nothing open — add one above.</p>
        ) : (
          <ul className="todo-list">
            {open.map((item) => (
              <TodoRow key={item.id} item={item} topic={topicById[item.topicId]} onToggle={toggleTodo} onOpen={setOpenItem} onDelete={deleteItem} />
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2>Done ({done.length})</h2>
          <ul className="todo-list">
            {done.map((item) => (
              <TodoRow key={item.id} item={item} topic={topicById[item.topicId]} onToggle={toggleTodo} onOpen={setOpenItem} onDelete={deleteItem} />
            ))}
          </ul>
        </section>
      )}

      <ItemEditor item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}

function TodoRow({ item, topic, onToggle, onOpen, onDelete }) {
  return (
    <li className={`todo-row${item.done ? ' todo-row-done' : ''}`}>
      <input type="checkbox" checked={Boolean(item.done)} onChange={() => onToggle(item.id)} aria-label={`Mark "${item.title}" ${item.done ? 'not done' : 'done'}`} />
      <button className="todo-title" onClick={() => onOpen(item)}>{item.title}</button>
      {topic && topic.id !== 'unsorted' && (
        <span className="item-topic" style={{ '--topic-color': topic.color }}>{topic.name}</span>
      )}
      <button className="btn-link todo-delete" onClick={() => onDelete(item.id)} aria-label="Delete">✕</button>
    </li>
  )
}
