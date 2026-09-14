// Single source of truth for the app's main views. App.jsx just renders
// this list — adding a new view/feature means adding an entry here and a
// component file, not editing App.jsx's render logic.

import { Library } from './components/Library.jsx'
import { Topics } from './components/Topics.jsx'
import { Dashboard } from './components/Dashboard.jsx'
import { Todos } from './components/Todos.jsx'

export const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', component: Dashboard },
  { id: 'todos', label: 'To-Dos', icon: '☑', component: Todos },
  { id: 'library', label: 'Library', icon: '▣', component: Library },
  { id: 'topics', label: 'Topics', icon: '☷', component: Topics },
]

export const DEFAULT_VIEW = 'dashboard'
