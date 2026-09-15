import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { streamChat } from '../lib/claude.js'

// A roomier, half-screen editor for writing or cleaning up longer notes —
// especially pasted Claude output that needs reformatting. Fully controlled:
// it never saves anything itself, it just edits `content` (and optionally
// `title`) in place via the callbacks, so the caller's own Save button still
// does the actual persisting.
export function NoteComposer({ title, onTitleChange, content, onContentChange, onClose, showTitle = true }) {
  const { settings, activeItems } = useStore()
  const textareaRef = useRef(null)
  const [reformatting, setReformatting] = useState(false)
  const [reformatError, setReformatError] = useState(null)
  const [preReformat, setPreReformat] = useState(null)

  function applyEdit(compute) {
    const el = textareaRef.current
    if (!el) return
    const result = compute(el)
    if (!result) return
    onContentChange(result.newValue)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(result.newStart, result.newEnd)
    })
  }

  function wrap(before, after = before) {
    applyEdit((el) => {
      const { selectionStart: start, selectionEnd: end, value } = el
      const selected = value.slice(start, end)
      return {
        newValue: value.slice(0, start) + before + selected + after + value.slice(end),
        newStart: start + before.length,
        newEnd: start + before.length + selected.length,
      }
    })
  }

  function prefixLines(prefix) {
    applyEdit((el) => {
      const { selectionStart: start, selectionEnd: end, value } = el
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      let lineEnd = value.indexOf('\n', end)
      if (lineEnd === -1) lineEnd = value.length
      const block = value.slice(lineStart, lineEnd)
      const newBlock = block.length ? block.split('\n').map((l) => prefix + l).join('\n') : prefix
      return {
        newValue: value.slice(0, lineStart) + newBlock + value.slice(lineEnd),
        newStart: lineStart,
        newEnd: lineStart + newBlock.length,
      }
    })
  }

  // Escape / ⌘Enter close the composer no matter which element has focus
  // (a toolbar button, the reformat button, not just the textarea) — a
  // handler scoped only to the textarea's onKeyDown missed these once focus
  // moved to a button.
  useEffect(() => {
    function onDocKeyDown(e) {
      if (e.key === 'Escape' || ((e.metaKey || e.ctrlKey) && e.key === 'Enter')) {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [onClose])

  function onTextareaKeyDown(e) {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      wrap('**')
    } else if (mod && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      wrap('_')
    }
  }

  async function reformat() {
    if (!settings.apiKey) {
      setReformatError('Add a Claude API key in Settings to use AI reformatting.')
      return
    }
    if (!content.trim() || reformatting) return
    setReformatError(null)
    setReformatting(true)
    setPreReformat(content)
    try {
      const prompt =
        'Reformat and clean up the following notes for clarity and structure. ' +
        'Preserve all information and meaning — do not add or remove facts. ' +
        'Use markdown (headers, bullet points, bold) where it genuinely helps. ' +
        'Return ONLY the reformatted text, with no preamble or commentary.\n\n---\n\n' +
        content
      await streamChat([{ role: 'user', content: prompt }], settings, activeItems, (textSoFar) => {
        onContentChange(textSoFar)
      })
    } catch (err) {
      setReformatError(err.message || String(err))
      onContentChange(preReformat ?? content)
      setPreReformat(null)
    } finally {
      setReformatting(false)
    }
  }

  function undoReformat() {
    if (preReformat == null) return
    onContentChange(preReformat)
    setPreReformat(null)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="composer" onClick={(e) => e.stopPropagation()}>
        <div className="composer-toolbar">
          <div className="composer-toolbar-group">
            <button type="button" title="Bold (⌘B)" onClick={() => wrap('**')}><strong>B</strong></button>
            <button type="button" title="Italic (⌘I)" onClick={() => wrap('_')}><em>I</em></button>
            <button type="button" title="Heading" onClick={() => prefixLines('## ')}>H</button>
            <button type="button" title="Bullet list" onClick={() => prefixLines('- ')}>•</button>
            <button type="button" title="Numbered list" onClick={() => prefixLines('1. ')}>1.</button>
            <button type="button" title="Code" onClick={() => wrap('`')}>{'</>'}</button>
          </div>
          <div className="composer-toolbar-group">
            <button
              type="button"
              className="btn-secondary btn-small"
              onClick={reformat}
              disabled={reformatting || !content.trim()}
              title="Ask Claude to clean up formatting and structure"
            >
              {reformatting ? 'Reformatting…' : '✨ Reformat with Claude'}
            </button>
            {preReformat != null && !reformatting && (
              <button type="button" className="btn-link" onClick={undoReformat}>Undo</button>
            )}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {reformatError && <div className="composer-error">{reformatError}</div>}

        {showTitle && (
          <input
            className="item-editor-title composer-title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Title"
          />
        )}

        <textarea
          ref={textareaRef}
          className="composer-textarea"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder="Write, or paste something to reformat…"
          autoFocus
        />

        <div className="composer-footer">
          ⌘B bold · ⌘I italic · ⌘Enter done · Esc done
        </div>
      </div>
    </div>
  )
}
