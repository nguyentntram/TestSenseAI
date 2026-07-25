// GitHub-OAuth-token-specific facade over the generic secret providers.
// This is the only module the rest of the backend should import — it hides
// which provider (AWS vs local) is active and the exact secret naming
// scheme, and it never logs a raw token.

import { awsSecretsProvider } from './awsSecretsProvider.js'
import { localSecretsProvider } from './localSecretsProvider.js'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

function getProvider() {
  return env.secretsProvider() === 'aws' ? awsSecretsProvider : localSecretsProvider
}

// Naming strategy: "<prefix>/github-oauth-token/<userId>". The prefix
// (SECRETS_NAME_PREFIX, e.g. "testsense-ai/dev" or "testsense-ai/prod")
// namespaces secrets per environment so dev and prod never collide in the
// same AWS account/region, and keeps every OAuth-token secret under one
// path an IAM policy can scope a Resource ARN pattern to.
function buildSecretName(userId) {
  return `${env.secretsNamePrefix()}/github-oauth-token/${userId}`
}

// Stores (or overwrites) the GitHub OAuth token for a user and returns the
// opaque secret reference to persist in `users.oauth_secret_reference`.
// The reference happens to equal the secret name today, but callers should
// treat it as opaque — do not parse or reconstruct it.
export async function storeGitHubToken(userId, accessToken) {
  const secretName = buildSecretName(userId)
  const reference = await getProvider().putSecret(secretName, accessToken)
  logger.info('Stored GitHub OAuth token', { userId, provider: env.secretsProvider() })
  return reference
}

export async function getGitHubToken(secretReference) {
  const token = await getProvider().getSecret(secretReference)
  return token
}

export async function deleteGitHubToken(secretReference) {
  await getProvider().deleteSecret(secretReference)
  logger.info('Deleted GitHub OAuth token', { provider: env.secretsProvider() })
}
