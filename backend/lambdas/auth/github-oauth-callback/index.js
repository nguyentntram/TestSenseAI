import { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager'
import { upsertUser } from '../../../shared/db-client.js'

const smClient = new SecretsManagerClient({})

export const handler = async (event) => {
  const params = event.queryStringParameters ?? {}
  const { code, state } = params

  if (!code) return res(400, { error: 'Missing OAuth code' })

  // Exchange code for access token with GitHub
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  })

  if (!tokenRes.ok) return res(502, { error: 'Token exchange failed' })
  const { access_token, scope, error } = await tokenRes.json()
  if (error || !access_token) return res(400, { error: error ?? 'No access token returned' })

  // Fetch the authenticated user's profile
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  const ghUser = await userRes.json()

  const emailRes = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/vnd.github+json' },
  })
  const emails = await emailRes.json()
  const primaryEmail = emails.find((e) => e.primary)?.email ?? null

  // Upsert user record in DB
  const userId = await upsertUser({
    githubId: ghUser.id,
    login: ghUser.login,
    email: primaryEmail,
    avatarUrl: ghUser.avatar_url,
  })

  // Store OAuth token in Secrets Manager (one secret per user)
  const secretName = `${process.env.SECRETS_PREFIX}/users/${userId}/oauth-token`
  const secretValue = JSON.stringify({ access_token, scope })

  try {
    await smClient.send(new UpdateSecretCommand({ SecretId: secretName, SecretString: secretValue }))
  } catch (e) {
    if (e.name === 'ResourceNotFoundException') {
      await smClient.send(new CreateSecretCommand({ Name: secretName, SecretString: secretValue }))
    } else {
      throw e
    }
  }

  console.log(`GitHub OAuth complete for user ${ghUser.login} (userId=${userId})`)

  // Redirect to the app with a session token (simplified — real impl uses JWT or session cookie)
  const redirectUrl = `${process.env.APP_URL}/projects?userId=${userId}`
  return {
    statusCode: 302,
    headers: { Location: redirectUrl },
    body: '',
  }
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
