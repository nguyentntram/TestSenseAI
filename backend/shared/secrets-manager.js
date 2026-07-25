import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManagerClient({})

// Simple in-memory cache — secrets rarely change within a Lambda execution environment.
// Cache TTL: 5 minutes. Lambda warm starts reuse this cache.
const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getSecret(secretArn) {
  const cached = cache.get(secretArn)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value
  }

  const command = new GetSecretValueCommand({ SecretId: secretArn })
  const response = await client.send(command)
  const value = response.SecretString ?? Buffer.from(response.SecretBinary, 'base64').toString()

  cache.set(secretArn, { value, fetchedAt: Date.now() })
  return value
}

export async function getSecretJson(secretArn) {
  const raw = await getSecret(secretArn)
  return JSON.parse(raw)
}
