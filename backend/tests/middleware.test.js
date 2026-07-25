import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requireAuth, getOptionalUserId } from '../src/middleware/requireAuth.js'
import { withErrorHandling } from '../src/middleware/withErrorHandling.js'
import { createSessionCookieHeader } from '../src/services/sessionService.js'
import { UnauthenticatedError, NotFoundError, ValidationError } from '../src/utils/errors.js'
import { env } from '../src/config/env.js'

function cookieHeaderFor(user) {
  const setCookie = createSessionCookieHeader(user)
  return setCookie.split(';')[0] // "name=value"
}

test('requireAuth throws UnauthenticatedError when there is no cookie at all', () => {
  assert.throws(() => requireAuth({ headers: {} }), UnauthenticatedError)
})

test('requireAuth throws UnauthenticatedError for a garbage cookie value', () => {
  assert.throws(
    () => requireAuth({ headers: { cookie: `${env.sessionCookieName()}=garbage` } }),
    UnauthenticatedError,
  )
})

test('requireAuth returns the userId for a valid session cookie', () => {
  const cookie = cookieHeaderFor({ id: 'user-1' })
  assert.equal(requireAuth({ headers: { cookie } }), 'user-1')
})

test('requireAuth reads a capitalized "Cookie" header too (API Gateway casing)', () => {
  const cookie = cookieHeaderFor({ id: 'user-2' })
  assert.equal(requireAuth({ headers: { Cookie: cookie } }), 'user-2')
})

test('getOptionalUserId returns null instead of throwing when signed out', () => {
  assert.equal(getOptionalUserId({ headers: {} }), null)
})

test('withErrorHandling converts an AppError into the consistent error JSON shape', async () => {
  const handler = withErrorHandling(async () => {
    throw new NotFoundError('Project was not found.', 'PROJECT_NOT_FOUND')
  })
  const response = await handler({ path: '/projects/x', httpMethod: 'GET' })

  assert.equal(response.statusCode, 404)
  const body = JSON.parse(response.body)
  assert.deepEqual(body, { error: { code: 'PROJECT_NOT_FOUND', message: 'Project was not found.' } })
})

test('withErrorHandling maps ValidationError to 400', async () => {
  const handler = withErrorHandling(async () => {
    throw new ValidationError('Bad input.')
  })
  const response = await handler({ path: '/projects', httpMethod: 'POST' })
  assert.equal(response.statusCode, 400)
})

test('withErrorHandling hides unexpected error details behind a generic 500', async () => {
  const handler = withErrorHandling(async () => {
    throw new Error('leaked secret: sk-abc123')
  })
  const response = await handler({ path: '/projects', httpMethod: 'GET' })

  assert.equal(response.statusCode, 500)
  const body = JSON.parse(response.body)
  assert.equal(body.error.code, 'INTERNAL_ERROR')
  assert.doesNotMatch(response.body, /sk-abc123/)
})

test('withErrorHandling passes through a successful response unchanged', async () => {
  const handler = withErrorHandling(async () => ({ statusCode: 200, headers: {}, body: '{"data":1}' }))
  const response = await handler({})
  assert.equal(response.statusCode, 200)
})
