// AWS Secrets Manager-backed secrets provider. Requires real AWS
// credentials and the IAM permissions documented in docs/DATABASE.md /
// backend README (secretsmanager:CreateSecret, PutSecretValue,
// GetSecretValue, DeleteSecret, scoped to the `SECRETS_NAME_PREFIX` path).
//
// This module has not been exercised against a real AWS account in this
// change — no AWS credentials were available in the development
// environment. It is included as the production implementation; verify it
// against a real Secrets Manager instance before relying on it.

import {
  SecretsManagerClient,
  PutSecretValueCommand,
  CreateSecretCommand,
  GetSecretValueCommand,
  DeleteSecretCommand,
  ResourceNotFoundException,
} from '@aws-sdk/client-secrets-manager'
import { env } from '../../config/env.js'

let client

function getClient() {
  if (!client) {
    client = new SecretsManagerClient({ region: env.awsRegion() })
  }
  return client
}

export const awsSecretsProvider = {
  async putSecret(name, value) {
    const secretsClient = getClient()
    try {
      await secretsClient.send(new PutSecretValueCommand({ SecretId: name, SecretString: value }))
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        await secretsClient.send(new CreateSecretCommand({ Name: name, SecretString: value }))
      } else {
        throw err
      }
    }
    return name
  },

  async getSecret(name) {
    const secretsClient = getClient()
    try {
      const result = await secretsClient.send(new GetSecretValueCommand({ SecretId: name }))
      return result.SecretString ?? null
    } catch (err) {
      if (err instanceof ResourceNotFoundException) return null
      throw err
    }
  },

  async deleteSecret(name) {
    const secretsClient = getClient()
    try {
      // Uses the default recovery window rather than force-deleting, so an
      // accidental delete can still be recovered from within AWS during the
      // retention period. See docs/DATABASE.md for the IAM/config notes.
      await secretsClient.send(new DeleteSecretCommand({ SecretId: name }))
    } catch (err) {
      if (!(err instanceof ResourceNotFoundException)) throw err
    }
  },
}
