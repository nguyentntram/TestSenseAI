import { parseCookies } from '../utils/cookies.js'
import { getUserIdFromSessionToken } from '../services/sessionService.js'
import { UnauthenticatedError } from '../utils/errors.js'
import { env } from '../config/env.js'

function extractSessionToken(event) {
  const cookieHeader = event.headers?.cookie ?? event.headers?.Cookie
  const cookies = parseCookies(cookieHeader)
  return cookies[env.sessionCookieName()]
}

// Returns the authenticated userId, or throws UnauthenticatedError (401).
export function requireAuth(event) {
  const token = extractSessionToken(event)
  const userId = getUserIdFromSessionToken(token)
  if (!userId) {
    throw new UnauthenticatedError()
  }
  return userId
}

// Same lookup, but returns null instead of throwing — used where an
// endpoint needs to behave differently for signed-out users without
// treating that as an error.
export function getOptionalUserId(event) {
  const token = extractSessionToken(event)
  return getUserIdFromSessionToken(token)
}
