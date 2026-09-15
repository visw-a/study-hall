import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { NoteComposer } from './NoteComposer.jsx'

export function QuickCapture() {
  const { addItem, topics, askClaude } = useStore()
  const [text, setText] = useState('')
  const [justSaved, setJustSaved] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const dismissTimer = useRef(null)

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
    setExpanded(false)
    const topic = topics.find((t) => t.id === item.topicId)
    clearTimeout(dismissTimer.current)
    setJustSaved({ item, topicName: topic?.name || 'Unsorted', auto: item.autoFiled })
    // Auto-filed notes just need a quick confirmation; a note that landed in
    // Unsorted stays visible (with the "ask Claude" option) until the next
    // save, since there's an action worth taking.
    if (item.autoFiled) {
      dismissTimer.current = setTimeout(() => setJustSaved(null), 3500)
    }
  }

  function askToCategorize() {
    if (!justSaved) return
    const topicNames = topics.filter((t) => t.id !== 'unsorted').map((t) => t.name)
    const list = topicNames.length ? topicNames.join(', ') : '(no topics yet — suggest a new one)'
    askClaude(
      `Which topic should this go under — "${justSaved.item.title}"?${justSaved.item.content ? `\n\n${justSaved.item.content}` : ''}\n\n` +
      `My existing topics: ${list}.\n\nRecommend one (or a new topic name if none fit), in one short sentence.`
    )
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  if (expanded) {
    return (
      <NoteComposer
        content={text}
        onContentChange={setText}
        onClose={() => setExpanded(false)}
        showTitle={false}
      />
    )
  }

  return (
    <div className="quick-capture">
      <div className="quick-capture-textarea-wrap">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Dump a thought, an idea, something you just learned… (⌘/Ctrl+Enter to save)"
          rows={3}
        />
        <button
          type="button"
          className="quick-capture-expand"
          onClick={() => setExpanded(true)}
          title="Expand to a larger editor with formatting and AI reformat"
        >
          ⤢ Expand
        </button>
      </div>
      <div className="quick-capture-row">
        <button className="btn-primary" onClick={save} disabled={!text.trim()}>
          Save note
        </button>
        {justSaved && (
          <span className="quick-capture-toast">
            Saved{justSaved.auto ? ` → filed under “${justSaved.topicName}”` : ' → Unsorted'}
            {!justSaved.auto && (
              <button type="button" className="btn-link" onClick={askToCategorize}>Ask Claude to suggest a topic</button>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
