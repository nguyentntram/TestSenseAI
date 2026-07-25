import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../src/services/projectService.js'
import { ValidationError, NotFoundError } from '../src/utils/errors.js'

function makeDeps(overrides = {}) {
  return {
    listProjectsForUser: async () => [],
    findProjectByIdForUser: async () => null,
    findProjectByRepositoryForUser: async () => null,
    createProjectRecord: async (record) => ({
      id: 'new-project-id',
      user_id: record.userId,
      name: record.name,
      description: record.description,
      repository_id: record.repositoryId,
      repository_owner: record.repositoryOwner,
      repository_name: record.repositoryName,
      repository_full_name: record.repositoryFullName,
      visibility: record.visibility,
      language: record.language,
      default_branch: record.defaultBranch,
      test_framework: record.testFramework,
      memory_indexing_enabled: true,
      sync_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    updateProjectRecord: async () => null,
    deleteProjectRecord: async () => true,
    fetchRepositoryForUser: async () => ({
      id: 555,
      fullName: 'octocat/hello-world',
      owner: 'octocat',
      name: 'hello-world',
      description: 'demo repo',
      language: 'JavaScript',
      private: false,
      defaultBranch: 'main',
    }),
    findUserById: async (id) => ({ id, oauth_secret_reference: 'ref' }),
    getUserGitHubToken: async () => 'fake-token',
    ...overrides,
  }
}

test('getProject throws NotFoundError (PROJECT_NOT_FOUND) when the row is missing', async () => {
  const deps = makeDeps({ findProjectByIdForUser: async () => null })
  await assert.rejects(() => getProject('missing-id', 'user-1', deps), (err) => {
    assert.ok(err instanceof NotFoundError)
    assert.equal(err.code, 'PROJECT_NOT_FOUND')
    assert.equal(err.statusCode, 404)
    return true
  })
})

test('getProject: a project belonging to another user is indistinguishable from missing (404, not 403)', async () => {
  // findProjectByIdForUser is itself user-scoped (see projectsRepository.test.js) —
  // from the service's point of view, "not mine" and "doesn't exist" are the
  // same signal: no row.
  const deps = makeDeps({ findProjectByIdForUser: async () => null })
  await assert.rejects(() => getProject('someone-elses-project', 'user-1', deps), NotFoundError)
})

test('listProjects maps repository rows to camelCase DTOs', async () => {
  const deps = makeDeps({
    listProjectsForUser: async () => [
      {
        id: 'p1',
        name: 'Demo',
        repository_full_name: 'octocat/hello-world',
        default_branch: 'main',
        sync_status: 'synced',
      },
    ],
  })
  const projects = await listProjects('user-1', deps)
  assert.equal(projects.length, 1)
  assert.equal(projects[0].repositoryFullName, 'octocat/hello-world')
  assert.equal(projects[0].defaultBranch, 'main')
})

test('createProject rejects missing repositoryOwner/repositoryName with ValidationError', async () => {
  const deps = makeDeps()
  await assert.rejects(() => createProject('user-1', {}, deps), ValidationError)
})

test('createProject rejects when GitHub does not confirm repository access', async () => {
  const deps = makeDeps({ fetchRepositoryForUser: async () => null })
  await assert.rejects(
    () => createProject('user-1', { repositoryOwner: 'octocat', repositoryName: 'hello-world' }, deps),
    ValidationError,
  )
})

test('createProject is idempotent: an existing (user, repository) connection is returned as-is', async () => {
  const existingRow = {
    id: 'already-connected',
    repository_id: 555,
    repository_full_name: 'octocat/hello-world',
  }
  const deps = makeDeps({ findProjectByRepositoryForUser: async () => existingRow })
  const result = await createProject(
    'user-1',
    { repositoryOwner: 'octocat', repositoryName: 'hello-world' },
    deps,
  )
  assert.equal(result.id, 'already-connected')
})

test('createProject creates a new project when none exists yet for this (user, repository)', async () => {
  const deps = makeDeps()
  const result = await createProject(
    'user-1',
    { repositoryOwner: 'octocat', repositoryName: 'hello-world', name: 'My Project' },
    deps,
  )
  assert.equal(result.id, 'new-project-id')
  assert.equal(result.name, 'My Project')
  assert.equal(result.repositoryFullName, 'octocat/hello-world')
})

test('updateProject throws NotFoundError for a project the user does not own', async () => {
  const deps = makeDeps({ findProjectByIdForUser: async () => null })
  await assert.rejects(() => updateProject('p1', 'user-1', { name: 'x' }, deps), NotFoundError)
})

test('updateProject rejects an invalid memoryIndexingEnabled type', async () => {
  const deps = makeDeps({ findProjectByIdForUser: async () => ({ id: 'p1' }) })
  await assert.rejects(
    () => updateProject('p1', 'user-1', { memoryIndexingEnabled: 'yes' }, deps),
    ValidationError,
  )
})

test('deleteProject throws NotFoundError when the project does not belong to the user', async () => {
  const deps = makeDeps({ findProjectByIdForUser: async () => null })
  await assert.rejects(() => deleteProject('p1', 'user-1', deps), NotFoundError)
})

test('deleteProject succeeds when the project exists and belongs to the user', async () => {
  const deps = makeDeps({
    findProjectByIdForUser: async () => ({ id: 'p1' }),
    deleteProjectRecord: async () => true,
  })
  await assert.doesNotReject(() => deleteProject('p1', 'user-1', deps))
})
