export function parseCookies(cookieHeader) {
  const result = {}
  if (!cookieHeader) return result

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=')
    if (!rawName) continue
    result[rawName] = decodeURIComponent(rawValue.join('='))
  }
  return result
}

export function serializeCookie(name, value, { maxAgeSeconds, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`]
  if (httpOnly) segments.push('HttpOnly')
  if (secure) segments.push('Secure')
  if (typeof maxAgeSeconds === 'number') segments.push(`Max-Age=${maxAgeSeconds}`)
  return segments.join('; ')
}
