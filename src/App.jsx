import { useState } from 'react'
import { StoreProvider } from './store/StoreContext.jsx'
import { Chat } from './components/Chat.jsx'
import { Settings } from './components/Settings.jsx'
import { CommandPalette } from './components/CommandPalette.jsx'
import { VIEWS, DEFAULT_VIEW } from './registry.js'

function AppShell() {
  const [activeViewId, setActiveViewId] = useState(DEFAULT_VIEW)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const ActiveView = VIEWS.find((v) => v.id === activeViewId)?.component || VIEWS[0].component

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="app-brand">Study Hall</div>
        <div className="app-nav-links">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              className={`app-nav-link${view.id === activeViewId ? ' active' : ''}`}
              onClick={() => setActiveViewId(view.id)}
            >
              <span className="app-nav-icon">{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>
        <span className="app-nav-kbd-hint" title="Open the command palette">⌘K</span>
        <button className="app-nav-link app-settings-link" onClick={() => setSettingsOpen(true)}>
          <span className="app-nav-icon">⚙</span>
          Settings
        </button>
      </nav>

      <div className="app-body">
        <main className="app-main">
          <ActiveView />
        </main>

        <Chat />
      </div>

      {settingsOpen && <Settings onClose={() => setSettingsOpen(false)} />}
      <CommandPalette onNavigate={setActiveViewId} />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  )
}
