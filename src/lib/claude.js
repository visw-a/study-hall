// Claude chat integration.
//
// With no API key, Study Hall answers with clearly-labeled offline replies
// built from your own library (so save-to-library and the rest of the UI
// are fully usable with zero setup). Paste a key in Settings to switch to
// real Claude calls, made directly from the browser.
//
// SECURITY NOTE: the key is stored in this browser's localStorage and sent
// straight to the Anthropic API from the page. That's fine for a personal,
// single-user tool on a device you trust — don't paste your key in on a
// shared or public computer, and don't share this page's URL alongside it
// (the URL itself carries no key; each browser holds its own).

import { searchItems } from './search.js'

const API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export async function testApiKey(apiKey, model) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`)
  }
  return true
}

/**
 * Send a chat turn to Claude, or produce an offline mock reply.
 * @param {Array<{role:'user'|'assistant', content:string}>} history
 * @param {{apiKey:string, model:string}} settings
 * @param {Array} libraryItems - for offline mode / grounding
 */
export async function sendChat(history, settings, libraryItems) {
  if (!settings.apiKey) {
    return offlineReply(history, libraryItems)
  }

  const system =
    'You are Claude, embedded as a study assistant inside "Study Hall", ' +
    "the user's personal learning library. Help them organize notes, " +
    "answer questions about what they've been learning, and keep " +
    'answers concise and practical.'

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model || 'claude-sonnet-5',
      max_tokens: 1024,
      system,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Claude request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()

  return text || '(empty response)'
}

// --- Offline mock -----------------------------------------------------

function offlineReply(history, libraryItems) {
  const lastUser = [...history].reverse().find((m) => m.role === 'user')
  const question = lastUser?.content || ''

  const ranked = searchItems(libraryItems || [], question).slice(0, 3)

  const prefix = '_[Offline mode — no API key set. Add one in Settings for real Claude answers.]_\n\n'

  if (ranked.length === 0) {
    return (
      prefix +
      `I don't have an API key yet, so I can't reach Claude for real. ` +
      `I also didn't find anything in your library matching "${question.trim() || '...'}". ` +
      `Once you add a key in Settings, I'll be able to answer this properly.`
    )
  }

  const bullets = ranked
    .map(({ item }) => `- **${item.title}** (${item.type === 'answer' ? 'saved answer' : 'note'})${item.content ? `: ${truncate(item.content, 140)}` : ''}`)
    .join('\n')

  return (
    prefix +
    `I can't call Claude for real without an API key, but here's what's already in your library related to "${truncate(question, 80)}":\n\n${bullets}\n\n` +
    `Add a key in Settings and I can synthesize a real answer instead of just listing matches.`
  )
}

function truncate(text, max) {
  if (!text) return ''
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}
