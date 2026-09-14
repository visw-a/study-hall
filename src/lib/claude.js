// Claude chat integration, via the official Anthropic SDK.
//
// With no API key, Study Hall answers with clearly-labeled offline replies
// built from your own library (so save-to-library and the rest of the UI
// are fully usable with zero setup). Paste a key in Settings to switch to
// real, streamed Claude calls, made directly from the browser.
//
// SECURITY NOTE: the key is stored in this browser's localStorage and sent
// straight to the Anthropic API from the page (dangerouslyAllowBrowser is
// required for exactly this reason — there's no server of ours in between).
// That's fine for a personal, single-user tool on a device you trust — don't
// paste your key in on a shared or public computer, and don't share this
// page's URL alongside it (the URL itself carries no key; each browser holds
// its own).

import Anthropic from '@anthropic-ai/sdk'
import { searchItems } from './search.js'

export const MODELS = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — fastest, cheapest', hint: 'Good for quick questions and tagging.' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5 — balanced (default)', hint: 'Best default for everyday use.' },
  { id: 'claude-opus-5', label: 'Opus 5 — most capable', hint: 'Best for synthesizing/reviewing a whole topic.' },
]
export const DEFAULT_MODEL = 'claude-sonnet-5'

const SYSTEM_PROMPT =
  'You are Claude, embedded as a study assistant inside "Study Hall", ' +
  "the user's personal learning library of notes and to-dos. Help them " +
  "organize notes, answer questions about what they've been learning, and " +
  'keep answers concise and practical. When useful, suggest a short title ' +
  'and 2-4 tags for turning the answer into a library item.'

// One client per API key — recreated only when the key actually changes.
let cachedClient = null
let cachedKey = null

function getClient(apiKey) {
  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
    cachedKey = apiKey
  }
  return cachedClient
}

export async function testApiKey(apiKey, model) {
  const client = getClient(apiKey)
  await client.messages.create({
    model,
    max_tokens: 16,
    messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
  })
  return true
}

/**
 * Stream a chat turn to Claude, calling onDelta(textSoFar) as tokens arrive
 * so the UI can render the reply as it's generated. Falls back to a single
 * offline reply (delivered as one onDelta call) when no API key is set.
 *
 * @param {Array<{role:'user'|'assistant', content:string}>} history
 * @param {{apiKey:string, model:string}} settings
 * @param {Array} libraryItems - for offline mode / grounding
 * @param {(textSoFar: string) => void} onDelta
 * @returns {Promise<string>} the final reply text
 */
export async function streamChat(history, settings, libraryItems, onDelta) {
  if (!settings.apiKey) {
    const reply = offlineReply(history, libraryItems)
    onDelta(reply)
    return reply
  }

  const client = getClient(settings.apiKey)
  const stream = client.messages.stream({
    model: settings.model || DEFAULT_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })

  let text = ''
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
      onDelta(text)
    }
  }

  return text.trim() || '(empty response)'
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
