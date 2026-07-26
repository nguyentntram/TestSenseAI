import { createProject, getProjectByRepoFullName } from '../../../shared/db-client.js'
import { getSecretJson } from '../../../shared/secrets-manager.js'
import { GitHubClient } from '../../../shared/github-client.js'

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId
  if (!userId) return res(401, { error: 'Unauthorized' })

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch { return res(400, { error: 'Invalid JSON' }) }

  const { repositoryFullName, name, defaultBranch, language, testFramework } = body
  if (!repositoryFullName || !name) return res(400, { error: 'repositoryFullName and name are required' })

  // Prevent duplicate connections
  const existing = await getProjectByRepoFullName(repositoryFullName)
  if (existing) return res(409, { error: 'Repository is already connected' })

  // Verify the user has access to the repo before connecting
  const { access_token } = await getSecretJson(`${process.env.SECRETS_PREFIX}/users/${userId}/oauth-token`)
  const github = new GitHubClient(access_token)
  const [owner, repo] = repositoryFullName.split('/')

  try {
    await github.request(`/repos/${owner}/${repo}`)
  } catch (e) {
    if (e.status === 404) return res(404, { error: 'Repository not found or not accessible' })
    throw e
  }

  const projectId = await createProject({ name, repositoryFullName, defaultBranch: defaultBranch ?? 'main', language, testFramework, userId })
  console.log(`Created project ${projectId} for repo ${repositoryFullName}`)

  return res(201, { projectId, name, repositoryFullName })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
