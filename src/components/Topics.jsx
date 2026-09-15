import { useMemo, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { ItemCard } from './ItemCard.jsx'
import { ItemEditor } from './ItemEditor.jsx'

export function Topics() {
  const { activeItems, topics, addTopic, deleteTopic, askClaude } = useStore()
  const [newTopicName, setNewTopicName] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [openItem, setOpenItem] = useState(null)

  const counts = useMemo(() => {
    const map = {}
    for (const it of activeItems) map[it.topicId] = (map[it.topicId] || 0) + 1
    return map
  }, [activeItems])

  function createTopic() {
    if (!newTopicName.trim()) return
    addTopic(newTopicName)
    setNewTopicName('')
  }

  function reviewWithClaude(topic) {
    const topicItems = activeItems.filter((it) => it.topicId === topic.id)
    if (topicItems.length === 0) return
    const summary = topicItems
      .slice(0, 25)
      .map((it) => `- ${it.title}${it.content ? `: ${it.content.slice(0, 200)}` : ''}`)
      .join('\n')
    askClaude(
      `Here's everything I have filed under my "${topic.name}" topic:\n\n${summary}\n\n` +
      `Can you review this, point out gaps or things worth reinforcing, and suggest what I should look into next?`
    )
  }

  return (
    <div className="view topics-view">
      <h1>Topics</h1>

      <div className="topic-create">
        <input
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTopic()}
          placeholder="New topic name…"
        />
        <button className="btn-primary" onClick={createTopic} disabled={!newTopicName.trim()}>
          Add topic
        </button>
      </div>

      <div className="topic-list">
        {topics.map((topic) => {
          const count = counts[topic.id] || 0
          const isOpen = expanded === topic.id
          return (
            <div key={topic.id} className="topic-row">
              <button className="topic-row-header" onClick={() => setExpanded(isOpen ? null : topic.id)}>
                <span className="topic-dot" style={{ background: topic.color }} />
                <span className="topic-name">{topic.name}</span>
                <span className="topic-count">{count}</span>
                <span className="topic-caret">{isOpen ? '▾' : '▸'}</span>
              </button>
              <div className="topic-row-actions">
                <button
                  className="btn-secondary btn-small"
                  onClick={() => reviewWithClaude(topic)}
                  disabled={count === 0}
                  title={count === 0 ? 'Add items to this topic first' : 'Send this topic to Claude for review'}
                >
                  Review with Claude
                </button>
                {!topic.builtin && (
                  <button className="btn-danger btn-small" onClick={() => deleteTopic(topic.id)}>
                    Delete
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="topic-items">
                  {count === 0 ? (
                    <div className="empty-state small">Nothing filed here yet.</div>
                  ) : (
                    <div className="item-grid">
                      {activeItems
                        .filter((it) => it.topicId === topic.id)
                        .map((item) => (
                          <ItemCard key={item.id} item={item} topic={topic} query="" onOpen={setOpenItem} />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <ItemEditor item={openItem} onClose={() => setOpenItem(null)} />
    </div>
  )
}
