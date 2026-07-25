import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  listRepositoriesForUser,
  fetchRepositoryForUser,
} from '../src/services/githubRepositoryService.js'
import { AppError } from '../src/utils/errors.js'

function withMockedFetch(responseFactory, fn) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (...args) => responseFactory(...args)
  return fn().finally(() => {
    globalThis.fetch = originalFetch
  })
}

test('listRepositoriesForUser maps GitHub repo objects to our shape', async () => {
  await withMockedFetch(
    async () =>
      new Response(
        JSON.stringify([
          {
            id: 1,
            full_name: 'octocat/hello-world',
            owner: { login: 'octocat' },
            name: 'hello-world',
            description: 'demo',
            language: 'JavaScript',
            private: false,
            default_branch: 'main',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ]),
        { status: 200 },
      ),
    async () => {
      const repos = await listRepositoriesForUser('gho_abc')
      assert.equal(repos.length, 1)
      assert.equal(repos[0].fullName, 'octocat/hello-world')
      assert.equal(repos[0].owner, 'octocat')
    },
  )
})

test('listRepositoriesForUser throws AppError on a non-OK response', async () => {
  await withMockedFetch(
    async () => new Response('', { status: 403 }),
    async () => {
      await assert.rejects(() => listRepositoriesForUser('gho_abc'), AppError)
    },
  )
})

test('fetchRepositoryForUser returns null on 404 (repository not accessible)', async () => {
  await withMockedFetch(
    async () => new Response('', { status: 404 }),
    async () => {
      const repo = await fetchRepositoryForUser('gho_abc', 'octocat', 'private-repo')
      assert.equal(repo, null)
    },
  )
})

test('fetchRepositoryForUser returns the repository when GitHub confirms access', async () => {
  await withMockedFetch(
    async () =>
      new Response(
        JSON.stringify({
          id: 555,
          full_name: 'octocat/hello-world',
          owner: { login: 'octocat' },
          name: 'hello-world',
          description: 'demo',
          language: 'JavaScript',
          private: false,
          default_branch: 'main',
        }),
        { status: 200 },
      ),
    async () => {
      const repo = await fetchRepositoryForUser('gho_abc', 'octocat', 'hello-world')
      assert.equal(repo.id, 555)
      assert.equal(repo.fullName, 'octocat/hello-world')
    },
  )
})
