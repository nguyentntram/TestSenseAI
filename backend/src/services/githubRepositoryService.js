import { GITHUB_URLS } from '../config/github.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

// Repositories the authenticated user owns or collaborates on, shaped for
// the frontend's "select a repository" step. GitHub's `affiliation` param
// covers owner + collaborator + org-member repos in one call.
export async function listRepositoriesForUser(accessToken) {
  const response = await fetch(
    `${GITHUB_URLS.apiBase}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!response.ok) {
    logger.error('Listing GitHub repositories failed', { status: response.status })
    throw new AppError(502, 'GITHUB_API_ERROR', 'Failed to fetch repositories from GitHub.')
  }

  const repos = await response.json()
  return repos.map((repo) => ({
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    private: repo.private,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
  }))
}

// Used by project creation to confirm the authenticated GitHub user can
// actually see the repository they're claiming to connect, rather than
// trusting whatever repositoryId/owner/name the frontend sent.
export async function fetchRepositoryForUser(accessToken, owner, repoName) {
  const response = await fetch(`${GITHUB_URLS.apiBase}/repos/${owner}/${repoName}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (response.status === 404) return null
  if (!response.ok) {
    logger.error('Fetching GitHub repository failed', { status: response.status })
    throw new AppError(502, 'GITHUB_API_ERROR', 'Failed to verify repository access with GitHub.')
  }

  const repo = await response.json()
  return {
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    private: repo.private,
    defaultBranch: repo.default_branch,
  }
}
