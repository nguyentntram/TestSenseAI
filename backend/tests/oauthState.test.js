import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createOAuthState, verifyOAuthState } from '../src/utils/oauthState.js'
import { createSignedToken } from '../src/utils/signing.js'
import { env } from '../src/config/env.js'

test('createOAuthState/verifyOAuthState round-trip carries extra payload', () => {
  const state = createOAuthState({ redirectTo: '/connect-repository' })
  const payload = verifyOAuthState(state)
  assert.ok(payload)
  assert.equal(payload.redirectTo, '/connect-repository')
})

test('verifyOAuthState rejects a garbage state value', () => {
  assert.equal(verifyOAuthState('garbage'), null)
})

test('verifyOAuthState rejects a validly-signed token for a different purpose', () => {
  // Guards against a token minted for another purpose (e.g. a future
  // signed value type) being replayed here as if it were OAuth state.
  const wrongPurposeToken = createSignedToken(
    { purpose: 'something_else', redirectTo: '/projects' },
    env.oauthStateSecret(),
    600,
  )
  assert.equal(verifyOAuthState(wrongPurposeToken), null)
})
