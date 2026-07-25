import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { buildGitHubAuthorizationUrl } from '../../services/githubOAuthService.js'
import { createOAuthState } from '../../utils/oauthState.js'
import { buildCorsHeaders } from '../../config/cors.js'

// Only relative, known-safe destinations are allowed for post-login
// redirect — never redirect to an arbitrary attacker-supplied path/URL.
const ALLOWED_REDIRECT_PATHS = new Set(['/', '/projects', '/connect-repository'])

function sanitizeRedirectPath(rawPath) {
  return ALLOWED_REDIRECT_PATHS.has(rawPath) ? rawPath : '/projects'
}

// GET /auth/github/login
// Generates the GitHub authorization URL (with a signed, short-lived CSRF
// `state`) and redirects the browser to it.
export const handler = withErrorHandling(async (event) => {
  const redirectTo = sanitizeRedirectPath(event.queryStringParameters?.redirect_to)
  const state = createOAuthState({ redirectTo })
  const authorizationUrl = buildGitHubAuthorizationUrl(state)

  return {
    statusCode: 302,
    headers: { Location: authorizationUrl, ...buildCorsHeaders() },
    body: '',
  }
})
