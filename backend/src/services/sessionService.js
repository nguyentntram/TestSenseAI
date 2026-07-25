// Application session handling.
//
// MVP DESIGN CHOICE: sessions are a signed HttpOnly cookie carrying only the
// local `users.id`, not a server-side session store. This keeps the backend
// stateless (fits Lambda), but means logout only stops the cookie from being
// sent by the browser — it does not invalidate previously-issued cookies
// still held elsewhere (no server-side revocation list). Documented as a
// known limitation in docs/AUTH_FLOW.md; a production hardening step would
// move to a server-side session table or short-lived signed access tokens
// with rotation.
//
// The GitHub OAuth token itself is NEVER put in this cookie or exposed to
// the frontend — only a reference to it lives in the database, and the
// token itself lives in Secrets Manager (see services/secrets/).

import { createSignedToken, verifySignedToken } from '../utils/signing.js'
import { serializeCookie } from '../utils/cookies.js'
import { env } from '../config/env.js'

const SESSION_PURPOSE = 'app_session'

export function createSessionCookieHeader(user) {
  const token = createSignedToken(
    { purpose: SESSION_PURPOSE, userId: user.id },
    env.sessionSecret(),
    env.sessionTtlSeconds(),
  )
  return serializeCookie(env.sessionCookieName(), token, {
    maxAgeSeconds: env.sessionTtlSeconds(),
    secure: env.cookieSecure(),
    httpOnly: true,
    sameSite: 'Lax',
  })
}

export function createLogoutCookieHeader() {
  return serializeCookie(env.sessionCookieName(), '', {
    maxAgeSeconds: 0,
    secure: env.cookieSecure(),
    httpOnly: true,
    sameSite: 'Lax',
  })
}

// Returns the authenticated userId, or null if the cookie is missing,
// malformed, expired, or signed with a different secret.
export function getUserIdFromSessionToken(token) {
  if (!token) return null
  const payload = verifySignedToken(token, env.sessionSecret())
  if (!payload || payload.purpose !== SESSION_PURPOSE || !payload.userId) return null
  return payload.userId
}
