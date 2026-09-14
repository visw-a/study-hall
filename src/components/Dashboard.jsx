import { useMemo } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { kindLabel } from './ItemCard.jsx'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export function Dashboard() {
  const { items, topics, askClaude } = useStore()

  const stats = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - WEEK_MS
    const addedThisWeek = items.filter((it) => it.createdAt >= weekAgo)
    const unsorted = items.filter((it) => it.topicId === 'unsorted')
    const savedAnswers = items.filter((it) => it.type === 'answer')
    const notes = items.filter((it) => it.type === 'note')
    const openTodos = items.filter((it) => it.type === 'todo' && !it.done)
    const recent = [...items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)

    const perTopic = topics
      .filter((t) => t.id !== 'unsorted')
      .map((t) => ({ topic: t, count: items.filter((it) => it.topicId === t.id).length }))
      .sort((a, b) => b.count - a.count)

    return { addedThisWeek, unsorted, savedAnswers, notes, openTodos, recent, perTopic }
  }, [items, topics])

  function quizMe() {
    const week = stats.addedThisWeek
    if (week.length === 0) return
    const summary = week.map((it) => `- ${it.title}${it.content ? `: ${it.content.slice(0, 160)}` : ''}`).join('\n')
    askClaude(
      `Quiz me on what I've learned this week, based on these library items:\n\n${summary}\n\n` +
      `Ask me a handful of questions one at a time, starting with the first.`
    )
  }

  function reviewUnsorted() {
    if (stats.unsorted.length === 0) return
    const summary = stats.unsorted.slice(0, 20).map((it) => `- ${it.title}`).join('\n')
    askClaude(
      `These items in my library are unsorted:\n\n${summary}\n\nSuggest which topic each one probably belongs to (or a new topic name if none fit).`
    )
  }

  return (
    <div className="view dashboard-view">
      <h1>Dashboard</h1>

      <div className="stat-grid">
        <StatTile label="Total items" value={items.length} />
        <StatTile label="Notes" value={stats.notes.length} />
        <StatTile label="Open to-dos" value={stats.openTodos.length} />
        <StatTile label="Saved from Claude" value={stats.savedAnswers.length} />
        <StatTile label="Topics" value={topics.filter((t) => t.id !== 'unsorted').length} />
        <StatTile label="Added this week" value={stats.addedThisWeek.length} />
        <StatTile label="Unsorted" value={stats.unsorted.length} warn={stats.unsorted.length > 0} />
      </div>

      <div className="dashboard-actions">
        <button className="btn-secondary" onClick={quizMe} disabled={stats.addedThisWeek.length === 0}>
          Quiz me on this week
        </button>
        <button className="btn-secondary" onClick={reviewUnsorted} disabled={stats.unsorted.length === 0}>
          Help me sort {stats.unsorted.length || ''} unsorted item{stats.unsorted.length === 1 ? '' : 's'}
        </button>
      </div>

      <div className="dashboard-columns">
        <section>
          <h2>By topic</h2>
          {stats.perTopic.length === 0 ? (
            <p className="empty-state small">No topics yet — they'll appear as you add notes.</p>
          ) : (
            <ul className="topic-bar-list">
              {stats.perTopic.map(({ topic, count }) => (
                <li key={topic.id}>
                  <span className="topic-dot" style={{ background: topic.color }} />
                  <span className="topic-bar-name">{topic.name}</span>
                  <span className="topic-bar-count">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2>Recent activity</h2>
          {stats.recent.length === 0 ? (
            <p className="empty-state small">Nothing yet.</p>
          ) : (
            <ul className="recent-list">
              {stats.recent.map((item) => (
                <li key={item.id}>
                  <span className={`item-kind item-kind-${item.type}`}>{kindLabel(item)}</span>
                  <span className="recent-title">{item.title}</span>
                  <span className="recent-date">{new Date(item.updatedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function StatTile({ label, value, warn }) {
  return (
    <div className={`stat-tile${warn ? ' stat-tile-warn' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
