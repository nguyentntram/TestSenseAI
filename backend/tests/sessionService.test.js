import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createSessionCookieHeader,
  createLogoutCookieHeader,
  getUserIdFromSessionToken,
} from '../src/services/sessionService.js'
import { parseCookies } from '../src/utils/cookies.js'
import { env } from '../src/config/env.js'

function extractCookieValue(setCookieHeader) {
  const [pair] = setCookieHeader.split(';')
  const [, value] = pair.split('=')
  return decodeURIComponent(value)
}

test('createSessionCookieHeader produces a cookie whose token resolves back to the user id', () => {
  const header = createSessionCookieHeader({ id: 'user-123' })
  assert.match(header, /HttpOnly/)
  assert.match(header, new RegExp(`^${env.sessionCookieName()}=`))

  const token = extractCookieValue(header)
  assert.equal(getUserIdFromSessionToken(token), 'user-123')
})

test('getUserIdFromSessionToken returns null for a missing/invalid token', () => {
  assert.equal(getUserIdFromSessionToken(undefined), null)
  assert.equal(getUserIdFromSessionToken('garbage'), null)
})

test('createLogoutCookieHeader clears the cookie (Max-Age=0)', () => {
  const header = createLogoutCookieHeader()
  assert.match(header, /Max-Age=0/)
})

test('parseCookies extracts the session cookie from a raw Cookie header', () => {
  const setCookieHeader = createSessionCookieHeader({ id: 'user-456' })
  const cookieValue = extractCookieValue(setCookieHeader)
  const cookieHeader = `other=1; ${env.sessionCookieName()}=${encodeURIComponent(cookieValue)}`
  const cookies = parseCookies(cookieHeader)
  assert.equal(getUserIdFromSessionToken(cookies[env.sessionCookieName()]), 'user-456')
})
