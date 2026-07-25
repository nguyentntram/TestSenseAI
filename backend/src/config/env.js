// Centralized environment variable access. Reads are lazy (call the getters
// at request time, not at module-load time) so the local dev server and unit
// tests can boot without every production variable being set.

function readEnv(name, { required = false, fallback } = {}) {
  const value = process.env[name]
  if (value === undefined || value === '') {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
    return fallback
  }
  return value
}

export const env = {
  nodeEnv: () => readEnv('NODE_ENV', { fallback: 'development' }),
  isProduction: () => readEnv('NODE_ENV', { fallback: 'development' }) === 'production',

  appBaseUrl: () => readEnv('APP_BASE_URL', { fallback: 'http://localhost:5173' }),
  apiBaseUrl: () => readEnv('API_BASE_URL', { fallback: 'http://localhost:3001' }),
  corsAllowedOrigin: () =>
    readEnv('CORS_ALLOWED_ORIGIN', { fallback: 'http://localhost:5173' }),

  // GitHub OAuth App credentials. Real values only exist once a GitHub OAuth
  // App has been registered (see docs/AUTH_FLOW.md).
  githubClientId: () => readEnv('GITHUB_CLIENT_ID', { required: true }),
  githubClientSecret: () => readEnv('GITHUB_CLIENT_SECRET', { required: true }),
  githubCallbackUrl: () =>
    readEnv('GITHUB_CALLBACK_URL', { fallback: 'http://localhost:3001/auth/github/callback' }),

  // Signs the OAuth `state` value and the session cookie. Must be a long
  // random string in every real environment.
  oauthStateSecret: () => readEnv('OAUTH_STATE_SECRET', { required: true }),
  sessionSecret: () => readEnv('SESSION_SECRET', { required: true }),
  sessionCookieName: () => readEnv('SESSION_COOKIE_NAME', { fallback: 'testsense_session' }),
  sessionTtlSeconds: () => Number(readEnv('SESSION_TTL_SECONDS', { fallback: '604800' })), // 7 days
  cookieSecure: () => readEnv('COOKIE_SECURE', { fallback: 'false' }) === 'true',

  // 'aws' or 'local'. See backend/src/services/secrets/secretsService.js.
  secretsProvider: () => readEnv('SECRETS_PROVIDER', { fallback: 'local' }),
  awsRegion: () => readEnv('AWS_REGION', { fallback: 'us-east-1' }),
  secretsNamePrefix: () => readEnv('SECRETS_NAME_PREFIX', { fallback: 'testsense-ai/dev' }),

  // CockroachDB (PostgreSQL wire protocol).
  databaseUrl: () => readEnv('DATABASE_URL', { required: true }),
  databaseSslRejectUnauthorized: () =>
    readEnv('DATABASE_SSL_REJECT_UNAUTHORIZED', { fallback: 'true' }) === 'true',
}
