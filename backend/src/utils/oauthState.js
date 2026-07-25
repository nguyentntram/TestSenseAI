import { randomBytes } from 'node:crypto'
import { createSignedToken, verifySignedToken } from './signing.js'
import { env } from '../config/env.js'

const STATE_TTL_SECONDS = 600 // 10 minutes — long enough to complete the GitHub redirect, short enough to limit replay risk
const STATE_PURPOSE = 'github_oauth_state'

// Serverless-friendly CSRF protection: instead of storing the `state` value
// server-side (which wouldn't reliably survive between two separate Lambda
// invocations for /login and /callback), we sign it with a server secret and
// verify the signature + expiry on callback. This blocks forgery (an
// attacker without OAUTH_STATE_SECRET cannot produce a valid state) and
// limits replay to a 10-minute window.
//
// KNOWN LIMITATION: this does not prevent a single legitimate state value
// from being replayed more than once within that window (no single-use
// tracking). Acceptable for MVP; a production hardening step would add a
// single-use store (e.g. a short-TTL row in CockroachDB or a cache) keyed by
// a nonce. Tracked in docs/AUTH_FLOW.md.
export function createOAuthState(extra = {}) {
  const nonce = randomBytes(16).toString('hex')
  return createSignedToken(
    { purpose: STATE_PURPOSE, nonce, ...extra },
    env.oauthStateSecret(),
    STATE_TTL_SECONDS,
  )
}

// Returns the decoded state payload if valid, or null. Callers should treat
// a null return as "reject the callback with 400", not silently continue.
export function verifyOAuthState(state) {
  const payload = verifySignedToken(state, env.oauthStateSecret())
  if (!payload || payload.purpose !== STATE_PURPOSE) return null
  return payload
}
