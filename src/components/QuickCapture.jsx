import { useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'

export function QuickCapture() {
  const { addItem, topics } = useStore()
  const [text, setText] = useState('')
  const [justSaved, setJustSaved] = useState(null)

  function save() {
    const trimmed = text.trim()
    if (!trimmed) return
    const [firstLine, ...rest] = trimmed.split('\n')
    const item = addItem({
      type: 'note',
      title: firstLine.slice(0, 80),
      content: rest.join('\n').trim() || (firstLine.length > 80 ? firstLine : ''),
    })
    setText('')
    const topic = topics.find((t) => t.id === item.topicId)
    setJustSaved({ title: item.title, topicName: topic?.name || 'Unsorted', auto: item.autoFiled })
    setTimeout(() => setJustSaved(null), 3500)
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className="quick-capture">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Dump a thought, an idea, something you just learned… (⌘/Ctrl+Enter to save)"
        rows={3}
      />
      <div className="quick-capture-row">
        <button className="btn-primary" onClick={save} disabled={!text.trim()}>
          Save note
        </button>
        {justSaved && (
          <span className="quick-capture-toast">
            Saved{justSaved.auto ? ` → filed under “${justSaved.topicName}”` : ' → Unsorted'}
          </span>
        )}
      </div>
    </div>
  )
}
