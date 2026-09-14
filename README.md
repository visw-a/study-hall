# Study Hall

A learning library: notes you write and answers you keep from Claude, in one
searchable, organized place. Runs entirely in your browser — no backend, no
account, no database to manage.

## Features

- **Library** — quick-capture box (type, `Cmd/Ctrl+Enter`, done), ranked
  search with highlighted matches, filter by topic/tag/kind, full editor for
  any item.
- **To-Dos** — a checklist view for actionable items, separate from notes:
  add, check off, and see Open/Done at a glance. To-dos are still regular
  library items underneath, so they get topics, tags, and search too.
- **Topics** — folders with colors and per-topic counts, plus a "Review with
  Claude" button that sends everything in a topic to Claude as a prompt.
  Use topics for anything you want to group by kind or theme — podcasts,
  articles, ideas, businesses, whatever fits how you think.
- **Dashboard** — item counts, what you added this week, how much is still
  unsorted, recent activity, and one-click prompts ("quiz me on this week").
- **Claude sidebar** — one continuous chat. Nothing is filed automatically;
  any reply has a **Save to library** button that turns it into a real item
  with a suggested title, topic, and tags, keeping the question that
  produced it.
- **Auto-categorization** — compares a new note's words against what's
  already filed in each topic (with light stemming) and suggests a topic
  only when it's confident; otherwise the note goes to Unsorted rather than
  guessing wrong.
- **Persistence** — everything lives in this browser's `localStorage` under
  `studyhall.v1.*` keys. Export/import JSON from Settings since browser
  storage isn't forever.
- **Command palette (`Cmd/Ctrl+K`)** — jump straight to any view or any item
  by title/content/tag from anywhere in the app, no clicking through nav.
- **Installable / offline-capable** — a web app manifest + service worker
  let you "Add to Home Screen" / install it like a native app, and it keeps
  working after the first load even with no connection (the Claude chat
  itself still needs a network for real API replies).

## Running it locally

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (categorizer + search ranking)
npm run build     # production build to dist/
```

## Using Claude

With no API key set, the chat answers with clearly-labeled **offline**
replies built from your own library — everything (including save-to-library)
works with zero setup. To get real Claude answers, open **Settings**, paste
an API key from [console.anthropic.com](https://console.anthropic.com/), and
hit **Test connection**. Replies stream in token-by-token, and you can pick
the model (Haiku 4.5 for speed/cost, Sonnet 5 as the default, Opus 5 for the
most capable synthesis) in Settings.

The key is stored only in this browser's `localStorage` and sent directly to
Anthropic's API from the page via the official `@anthropic-ai/sdk`
(`dangerouslyAllowBrowser: true` — there's no server of ours in between). It
never touches a server of ours. Don't paste it in on a shared or public
computer.

Two entry points send Claude a ready-made prompt instead of a blank chat:
**"Review with Claude"** on a Topics row summarizes everything filed there,
and **"Ask Claude about this"** on any note/to-do editor asks Claude to go
deeper on that one item.

## Deploying so it's always accessible

This repo includes a GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds the app and publishes it to
GitHub Pages on every push to `main`. One-time setup, in the repo's GitHub
settings:

1. **Settings → Pages → Build and deployment → Source**: choose
   **GitHub Actions**.
2. Push (or merge) to `main`. The workflow builds, runs the tests, and
   deploys `dist/` to Pages.
3. Your permanent URL will be `https://<owner>.github.io/study-hall/`.

Because everything is client-side `localStorage`, each browser/device has
its own separate library and its own Claude key — there's nothing shared
between them. Use **Settings → Export JSON** to move your data between
devices, or back it up.

## Project layout

```
src/
  lib/
    storage.js      # localStorage read/write + export/import
    categorize.js    # auto-categorization + tag suggestion (tested)
    search.js         # ranked search + highlighting (tested)
    claude.js          # Claude API client (streaming) + offline mock
  store/
    StoreContext.jsx  # all app state + actions, via React Context
  components/
    Dashboard.jsx, Todos.jsx, Library.jsx, Topics.jsx  # the four main views
    Chat.jsx                 # Claude sidebar (streaming replies)
    CommandPalette.jsx       # Cmd/Ctrl+K — jump to a view or any item
    ItemEditor.jsx, QuickCapture.jsx, Settings.jsx, ErrorBoundary.jsx
  registry.js         # list of main views — add a new view here, not in App.jsx
  App.jsx

public/
  manifest.webmanifest, sw.js, icon-*.png   # installability + offline shell
```

Adding a new feature as a fourth view means adding one entry to
`registry.js` and a component file — `App.jsx` itself shouldn't need to
change.
