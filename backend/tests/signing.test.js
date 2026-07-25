import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSignedToken, verifySignedToken } from '../src/utils/signing.js'

test('createSignedToken/verifySignedToken round-trip', () => {
  const token = createSignedToken({ userId: 'abc-123' }, 'secret', 60)
  const payload = verifySignedToken(token, 'secret')
  assert.equal(payload.userId, 'abc-123')
});

test('verifySignedToken rejects a token signed with a different secret', () => {
  const token = createSignedToken({ userId: 'abc-123' }, 'secret-a', 60)
  assert.equal(verifySignedToken(token, 'secret-b'), null)
});

test('verifySignedToken rejects a tampered payload', () => {
  const token = createSignedToken({ userId: 'abc-123' }, 'secret', 60)
  const signaturePart = token.split('.')[1]
  const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'attacker' })).toString('base64url')
  assert.equal(verifySignedToken(`${tamperedPayload}.${signaturePart}`, 'secret'), null)
});

test('verifySignedToken rejects an expired token', () => {
  const token = createSignedToken({ userId: 'abc-123' }, 'secret', -1)
  assert.equal(verifySignedToken(token, 'secret'), null)
});

test('verifySignedToken rejects malformed input', () => {
  assert.equal(verifySignedToken('not-a-token', 'secret'), null)
  assert.equal(verifySignedToken('', 'secret'), null)
  assert.equal(verifySignedToken(undefined, 'secret'), null)
});
