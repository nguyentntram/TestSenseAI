import {
  findUserByGithubUserId,
  createUser,
  updateUserProfile,
  findUserById,
} from '../repositories/usersRepository.js'
import { storeGitHubToken, getGitHubToken } from './secrets/secretsService.js'
import { UnauthenticatedError } from '../utils/errors.js'

// Creates the local user on first sign-in, or updates their profile +
// refreshes the stored token on subsequent sign-ins. The GitHub access
// token is written to Secrets Manager (or the local dev provider) here —
// it is never returned to the caller and never written to the `users` row
// directly, only the secret reference is.
export async function findOrCreateUserFromGitHubProfile(githubProfile, accessToken) {
  const existing = await findUserByGithubUserId(githubProfile.githubUserId)

  // Store under the existing user's id if we have one yet, otherwise a
  // fresh row is inserted first so we have a stable id to key the secret on.
  if (existing) {
    const secretReference = await storeGitHubToken(existing.id, accessToken)
    return updateUserProfile(existing.id, { ...githubProfile, oauthSecretReference: secretReference })
  }

  const created = await createUser({ ...githubProfile, oauthSecretReference: 'pending' })
  const secretReference = await storeGitHubToken(created.id, accessToken)
  return updateUserProfile(created.id, { ...githubProfile, oauthSecretReference: secretReference })
}

// Throws rather than returning null/undefined so callers never accidentally
// send GitHub a request with a missing token (which GitHub rejects, and
// which previously surfaced to the frontend as a misleading 502
// GITHUB_API_ERROR instead of a clear "please sign in again"). Missing here
// most commonly means SECRETS_PROVIDER=local lost its in-memory token to a
// dev-server restart — the session cookie survives that, the token doesn't.
export async function getUserGitHubToken(user) {
  const token = await getGitHubToken(user.oauth_secret_reference)
  if (!token) {
    throw new UnauthenticatedError(
      'Your GitHub authorization is missing or has expired. Please sign in again.',
    )
  }
  return token
}

export { findUserById }
