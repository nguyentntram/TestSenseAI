import './helpers/testEnv.js'
process.env.SECRETS_PROVIDER ??= 'local'

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  storeGitHubToken,
  getGitHubToken,
  deleteGitHubToken,
} from '../src/services/secrets/secretsService.js'

test('storeGitHubToken/getGitHubToken round-trip via the local provider', async () => {
  const reference = await storeGitHubToken('user-1', 'gho_fake_token_value')
  assert.ok(reference.includes('user-1'))

  const token = await getGitHubToken(reference)
  assert.equal(token, 'gho_fake_token_value')
})

test('storing a token again for the same user overwrites the previous value', async () => {
  const reference = await storeGitHubToken('user-2', 'first-token')
  await storeGitHubToken('user-2', 'second-token')
  assert.equal(await getGitHubToken(reference), 'second-token')
})

test('getGitHubToken returns null for a reference that was never stored', async () => {
  assert.equal(await getGitHubToken('testsense-ai/dev/github-oauth-token/never-existed'), null)
})

test('deleteGitHubToken removes the stored value', async () => {
  const reference = await storeGitHubToken('user-3', 'to-be-deleted')
  await deleteGitHubToken(reference)
  assert.equal(await getGitHubToken(reference), null)
})
