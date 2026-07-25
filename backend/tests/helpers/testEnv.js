// Imported first by every test file that (transitively) touches
// backend/src/config/env.js. Provides fake-but-well-formed values for every
// required environment variable so tests never need a real GitHub App,
// AWS account, or CockroachDB instance. Never real values.
process.env.GITHUB_CLIENT_ID ??= 'test-client-id'
process.env.GITHUB_CLIENT_SECRET ??= 'test-client-secret'
process.env.OAUTH_STATE_SECRET ??= 'test-oauth-state-secret'
process.env.SESSION_SECRET ??= 'test-session-secret'
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:26257/test'
