export function formatRelativeTime(isoString) {
  const then = new Date(isoString).getTime()
  const diffMs = Date.now() - then
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`

  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
