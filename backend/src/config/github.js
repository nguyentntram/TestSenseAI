// Centralized GitHub OAuth configuration.
//
// PENDING CONFIRMATION FROM HAN (see docs/PENDING_INTEGRATIONS.md):
// Han is researching the GitHub API/webhook requirements for PR ingestion,
// including whether the team should use a classic GitHub OAuth App or a
// GitHub App, and which scopes/permissions PR ingestion actually needs.
//
// This file assumes a classic OAuth App (authorization code flow against
// github.com/login/oauth/*) because that is the simplest fit for "sign in
// with GitHub" alone. If Han's research concludes the team needs a GitHub
// App instead (e.g. for installation-scoped tokens or webhook management),
// the token-exchange logic in githubOAuthService.js and this scope list are
// the only places that should need to change.
//
// Scopes are intentionally minimal for now: enough to identify the user and
// read their public repositories. Do NOT widen this list without updating
// this comment and docs/PENDING_INTEGRATIONS.md.
export const GITHUB_OAUTH_SCOPES = [
  'read:user', // identify the signed-in user
  'public_repo', // list/read public repositories for the connect-repository flow
  // 'repo' would be required for private repository support, but that is a
  // broader permission than the current flow needs. Pending Han's
  // confirmation on whether private repositories must be supported and, if
  // so, whether that should come from a GitHub App with fine-grained
  // "Contents: Read-only" permission instead of a broad OAuth `repo` scope.
]

export const GITHUB_URLS = {
  authorize: 'https://github.com/login/oauth/authorize',
  accessToken: 'https://github.com/login/oauth/access_token',
  apiBase: 'https://api.github.com',
}
