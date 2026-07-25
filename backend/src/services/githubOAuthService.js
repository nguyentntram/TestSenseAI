// Talks to GitHub's OAuth endpoints directly via `fetch` (available
// globally in Node 18+) rather than pulling in an SDK like Octokit — the
// surface area we need (authorize URL, token exchange, "who am I") is small
// enough that a dependency isn't worth it. See config/github.js for the
// scope list and the OAuth-App-vs-GitHub-App note pending Han.

import { GITHUB_OAUTH_SCOPES, GITHUB_URLS } from '../config/github.js'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export function buildGitHubAuthorizationUrl(state) {
  const url = new URL(GITHUB_URLS.authorize)
  url.searchParams.set('client_id', env.githubClientId())
  url.searchParams.set('redirect_uri', env.githubCallbackUrl())
  url.searchParams.set('scope', GITHUB_OAUTH_SCOPES.join(' '))
  url.searchParams.set('state', state)
  url.searchParams.set('allow_signup', 'true')
  return url.toString()
}

// Exchanges the one-time authorization `code` for an access token. Never
// log the returned token.
export async function exchangeCodeForAccessToken(code) {
  const response = await fetch(GITHUB_URLS.accessToken, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.githubClientId(),
      client_secret: env.githubClientSecret(),
      code,
      redirect_uri: env.githubCallbackUrl(),
    }),
  })

  if (!response.ok) {
    logger.error('GitHub token exchange failed', { status: response.status })
    throw new AppError(502, 'GITHUB_OAUTH_ERROR', 'Failed to exchange GitHub authorization code.')
  }

  const payload = await response.json()
  if (payload.error || !payload.access_token) {
    logger.error('GitHub token exchange returned an error payload', {
      error: payload.error,
    })
    throw new AppError(502, 'GITHUB_OAUTH_ERROR', 'GitHub did not return an access token.')
  }

  return payload.access_token
}

export async function fetchAuthenticatedGitHubUser(accessToken) {
  const response = await fetch(`${GITHUB_URLS.apiBase}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })

  if (!response.ok) {
    logger.error('Fetching authenticated GitHub user failed', { status: response.status })
    throw new AppError(502, 'GITHUB_API_ERROR', 'Failed to fetch the authenticated GitHub user.')
  }

  const profile = await response.json()
  return {
    githubUserId: profile.id,
    githubUsername: profile.login,
    githubEmail: profile.email,
    avatarUrl: profile.avatar_url,
  }
}
