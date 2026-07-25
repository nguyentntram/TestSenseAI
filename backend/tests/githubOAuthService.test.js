import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGitHubAuthorizationUrl,
  exchangeCodeForAccessToken,
  fetchAuthenticatedGitHubUser,
} from '../src/services/githubOAuthService.js'
import { AppError } from '../src/utils/errors.js'

function withMockedFetch(responseFactory, fn) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (...args) => responseFactory(...args)
  return fn().finally(() => {
    globalThis.fetch = originalFetch
  })
}

test('buildGitHubAuthorizationUrl includes client id, redirect uri, scopes, and state', () => {
  const url = new URL(buildGitHubAuthorizationUrl('signed-state-value'))
  assert.equal(url.origin + url.pathname, 'https://github.com/login/oauth/authorize')
  assert.equal(url.searchParams.get('client_id'), 'test-client-id')
  assert.equal(url.searchParams.get('state'), 'signed-state-value')
  assert.ok(url.searchParams.get('scope').includes('read:user'))
})

test('exchangeCodeForAccessToken returns the access token on success', async () => {
  await withMockedFetch(
    async () => new Response(JSON.stringify({ access_token: 'gho_abc' }), { status: 200 }),
    async () => {
      const token = await exchangeCodeForAccessToken('some-code')
      assert.equal(token, 'gho_abc')
    },
  )
})

test('exchangeCodeForAccessToken throws AppError when GitHub returns an error payload', async () => {
  await withMockedFetch(
    async () =>
      new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200 }),
    async () => {
      await assert.rejects(() => exchangeCodeForAccessToken('bad-code'), AppError)
    },
  )
})

test('exchangeCodeForAccessToken throws AppError on a non-OK HTTP response', async () => {
  await withMockedFetch(
    async () => new Response('', { status: 500 }),
    async () => {
      await assert.rejects(() => exchangeCodeForAccessToken('some-code'), AppError)
    },
  )
})

test('fetchAuthenticatedGitHubUser maps the GitHub profile shape to our internal shape', async () => {
  await withMockedFetch(
    async () =>
      new Response(
        JSON.stringify({ id: 42, login: 'octocat', email: 'octo@example.com', avatar_url: 'https://x/y.png' }),
        { status: 200 },
      ),
    async () => {
      const profile = await fetchAuthenticatedGitHubUser('gho_abc')
      assert.deepEqual(profile, {
        githubUserId: 42,
        githubUsername: 'octocat',
        githubEmail: 'octo@example.com',
        avatarUrl: 'https://x/y.png',
      })
    },
  )
})
