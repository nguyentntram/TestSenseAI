// Minimal signed-token helper used for both the OAuth CSRF `state` value and
// the session cookie. Deliberately hand-rolled (HMAC-SHA256 over a base64url
// JSON payload) instead of pulling in a JWT library — the format is not
// meant to be a general-purpose JWT, just a small, auditable signed blob:
//
//   base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
//
// This is a SIGNED value, not an ENCRYPTED one — never put anything in the
// payload that shouldn't be readable by whoever holds the cookie/state
// value (e.g. never put a raw GitHub token in here).

import { createHmac, timingSafeEqual } from 'node:crypto'

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function sign(payloadBase64, secret) {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

export function createSignedToken(payload, secret, ttlSeconds) {
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  }
  const payloadBase64 = base64url(JSON.stringify(fullPayload))
  const signature = sign(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

// Returns the decoded payload if the token is well-formed, signed with the
// given secret, and not expired. Returns null otherwise (never throws) so
// callers can treat any malformed/expired/tampered token as "invalid".
export function verifySignedToken(token, secret) {
  if (typeof token !== 'string' || !token.includes('.')) return null

  const lastDot = token.lastIndexOf('.')
  const payloadBase64 = token.slice(0, lastDot)
  const providedSignature = token.slice(lastDot + 1)
  const expectedSignature = sign(payloadBase64, secret)

  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
