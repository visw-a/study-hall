import { useRef, useState } from 'react'
import { useStore } from '../store/StoreContext.jsx'
import { testApiKey, MODELS } from '../lib/claude.js'

export function Settings({ onClose }) {
  const { settings, updateSettings, exportData, importData, reminderPermission, requestReminderPermission } = useStore()
  const [keyDraft, setKeyDraft] = useState(settings.apiKey)
  const [testState, setTestState] = useState(null) // 'testing' | 'ok' | { error }
  const fileInputRef = useRef(null)

  function saveKey() {
    updateSettings({ apiKey: keyDraft.trim() })
    setTestState(null)
  }

  async function test() {
    setTestState('testing')
    try {
      await testApiKey(keyDraft.trim(), settings.model)
      setTestState('ok')
    } catch (err) {
      setTestState({ error: err.message })
    }
  }

  function doExport() {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `study-hall-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function doImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (window.confirm('Import will merge/replace stored data with this file. Continue?')) {
          importData(parsed)
          alert('Import complete.')
        }
      } catch (err) {
        alert(`Could not import: ${err.message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Settings</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <section className="settings-section">
          <h3>Claude API key</h3>
          <p className="settings-hint">
            Stored only in this browser's local storage and sent directly to Anthropic's API from this page.
            Leave blank to use offline mode (replies built from your own library, no network call).
          </p>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
          />
          <div className="settings-row">
            <button className="btn-secondary" onClick={test} disabled={!keyDraft.trim() || testState === 'testing'}>
              {testState === 'testing' ? 'Testing…' : 'Test connection'}
            </button>
            <button className="btn-primary" onClick={saveKey}>Save key</button>
          </div>
          {testState === 'ok' && <div className="settings-status settings-status-ok">✓ Connected</div>}
          {testState?.error && <div className="settings-status settings-status-error">✕ {testState.error}</div>}

          <label className="settings-model-label">
            Model
            <select value={settings.model} onChange={(e) => updateSettings({ model: e.target.value })}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <p className="settings-hint">{MODELS.find((m) => m.id === settings.model)?.hint}</p>
        </section>

        <section className="settings-section">
          <h3>To-do reminders</h3>
          <p className="settings-hint">
            Browser notifications for to-dos with a due date — best-effort only: this is a
            plain static site with no server, so a reminder can only fire while Study Hall
            is open in a tab (checked every 30 seconds), not after it's closed.
          </p>
          {reminderPermission === 'unsupported' && (
            <div className="settings-status">Notifications aren't supported in this browser.</div>
          )}
          {reminderPermission === 'granted' && (
            <div className="settings-status settings-status-ok">✓ Reminders enabled</div>
          )}
          {reminderPermission === 'denied' && (
            <div className="settings-status settings-status-error">
              Blocked — re-enable notifications for this site in your browser's settings.
            </div>
          )}
          {reminderPermission === 'default' && (
            <button className="btn-secondary" onClick={requestReminderPermission}>Enable reminders</button>
          )}
        </section>

        <section className="settings-section">
          <h3>Data</h3>
          <p className="settings-hint">Everything lives in this browser only. Export regularly so a cleared cache can't take your library with it.</p>
          <div className="settings-row">
            <button className="btn-secondary" onClick={doExport}>Export JSON</button>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={doImport} />
          </div>
        </section>
      </div>
    </div>
  )
}
