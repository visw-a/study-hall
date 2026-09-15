// Due-date formatting shared between the To-Dos view and the Dashboard.
const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(ts) {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * @param {number} dueAt - epoch ms
 * @returns {{label: string, overdue: boolean, dueSoon: boolean} | null}
 */
export function describeDue(dueAt) {
  if (!dueAt) return null
  const diffDays = Math.round((startOfDay(dueAt) - startOfDay(Date.now())) / DAY_MS)
  const overdue = diffDays < 0

  let label
  if (diffDays === 0) label = 'Today'
  else if (diffDays === 1) label = 'Tomorrow'
  else if (diffDays === -1) label = 'Yesterday (overdue)'
  else if (overdue) label = `${formatShortDate(dueAt)} (overdue)`
  else label = formatShortDate(dueAt)

  return { label, overdue, dueSoon: diffDays >= 0 && diffDays <= 2 }
}

function formatShortDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
