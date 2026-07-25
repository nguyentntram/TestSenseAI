import * as projectsRepository from '../repositories/projectsRepository.js'
import * as githubRepositoryService from './githubRepositoryService.js'
import * as userService from './userService.js'
import { toProjectDto } from '../utils/serializers.js'
import { requireString, optionalString } from '../utils/validation.js'
import { NotFoundError, ValidationError } from '../utils/errors.js'

// Every exported function takes its collaborators as a trailing `deps`
// object, defaulting to the real modules — the same pattern the repository
// layer uses for its `db` parameter. This is what lets tests/*.test.js
// exercise ownership enforcement, duplicate handling, and validation with
// plain in-memory fakes instead of a real database or GitHub API, with no
// module-mocking magic involved.
const defaultDeps = {
  listProjectsForUser: projectsRepository.listProjectsForUser,
  findProjectByIdForUser: projectsRepository.findProjectByIdForUser,
  findProjectByRepositoryForUser: projectsRepository.findProjectByRepositoryForUser,
  createProjectRecord: projectsRepository.createProjectRecord,
  updateProjectRecord: projectsRepository.updateProjectRecord,
  deleteProjectRecord: projectsRepository.deleteProjectRecord,
  fetchRepositoryForUser: githubRepositoryService.fetchRepositoryForUser,
  findUserById: userService.findUserById,
  getUserGitHubToken: userService.getUserGitHubToken,
}

export async function listProjects(userId, deps = defaultDeps) {
  const rows = await deps.listProjectsForUser(userId)
  return rows.map(toProjectDto)
}

export async function getProject(projectId, userId, deps = defaultDeps) {
  const row = await deps.findProjectByIdForUser(projectId, userId)
  if (!row) {
    throw new NotFoundError('Project was not found.', 'PROJECT_NOT_FOUND')
  }
  return toProjectDto(row)
}

function validateCreateInput(input) {
  const repositoryOwner = requireString(input.repositoryOwner, 'repositoryOwner')
  const repositoryName = requireString(input.repositoryName, 'repositoryName')
  const name = requireString(input.name ?? repositoryName, 'name')
  const defaultBranch = requireString(input.defaultBranch ?? 'main', 'defaultBranch')
  const description = optionalString(input.description, 'description')
  const testFramework = optionalString(input.testFramework, 'testFramework')
  return { repositoryOwner, repositoryName, name, defaultBranch, description, testFramework }
}

export async function createProject(userId, input, deps = defaultDeps) {
  const validated = validateCreateInput(input)

  const user = await deps.findUserById(userId)
  if (!user) {
    throw new NotFoundError('User was not found.', 'USER_NOT_FOUND')
  }

  // Confirm the authenticated GitHub user can actually see this repository
  // — never trust a client-supplied repositoryId/owner/name pair on its own.
  const accessToken = await deps.getUserGitHubToken(user)
  const repository = await deps.fetchRepositoryForUser(
    accessToken,
    validated.repositoryOwner,
    validated.repositoryName,
  )
  if (!repository) {
    throw new ValidationError(
      'That repository was not found or is not accessible with your GitHub account.',
    )
  }

  // Idempotent duplicate handling: connecting the same repository twice
  // returns the existing project rather than erroring, since from the
  // user's point of view "connect this repo" already succeeded.
  const existing = await deps.findProjectByRepositoryForUser(userId, repository.id)
  if (existing) {
    return toProjectDto(existing)
  }

  const created = await deps.createProjectRecord({
    userId,
    name: validated.name,
    description: validated.description,
    repositoryId: repository.id,
    repositoryOwner: repository.owner,
    repositoryName: repository.name,
    repositoryFullName: repository.fullName,
    visibility: repository.private ? 'private' : 'public',
    language: repository.language,
    defaultBranch: validated.defaultBranch || repository.defaultBranch,
    testFramework: validated.testFramework,
  })

  return toProjectDto(created)
}

function validateUpdateInput(input) {
  const update = {}
  if (input.name !== undefined) update.name = requireString(input.name, 'name')
  if (input.description !== undefined) update.description = optionalString(input.description, 'description')
  if (input.defaultBranch !== undefined) update.defaultBranch = requireString(input.defaultBranch, 'defaultBranch')
  if (input.testFramework !== undefined) update.testFramework = optionalString(input.testFramework, 'testFramework')
  if (input.memoryIndexingEnabled !== undefined) {
    if (typeof input.memoryIndexingEnabled !== 'boolean') {
      throw new ValidationError('"memoryIndexingEnabled" must be a boolean.')
    }
    update.memoryIndexingEnabled = input.memoryIndexingEnabled
  }
  return update
}

export async function updateProject(projectId, userId, input, deps = defaultDeps) {
  const update = validateUpdateInput(input)

  const existing = await deps.findProjectByIdForUser(projectId, userId)
  if (!existing) {
    throw new NotFoundError('Project was not found.', 'PROJECT_NOT_FOUND')
  }

  const updated = await deps.updateProjectRecord(projectId, userId, update)
  return toProjectDto(updated)
}

export async function deleteProject(projectId, userId, deps = defaultDeps) {
  const existing = await deps.findProjectByIdForUser(projectId, userId)
  if (!existing) {
    throw new NotFoundError('Project was not found.', 'PROJECT_NOT_FOUND')
  }

  const deleted = await deps.deleteProjectRecord(projectId, userId)
  if (!deleted) {
    throw new NotFoundError('Project was not found.', 'PROJECT_NOT_FOUND')
  }
}
