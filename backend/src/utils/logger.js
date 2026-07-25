// Minimal structured logger. Deliberately does not accept a free-form
// "extra" blob for error-level logs, to make it harder to accidentally log a
// token, secret, or full request/user object. Pass only plain, already-safe
// fields.

function log(level, message, fields = {}) {
  const entry = { level, message, ...fields, timestamp: new Date().toISOString() }
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry))
}

export const logger = {
  info: (message, fields) => log('info', message, fields),
  warn: (message, fields) => log('warn', message, fields),
  error: (message, fields) => log('error', message, fields),
}
