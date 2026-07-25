import { verifyOAuthState } from '../../utils/oauthState.js'
import {
  exchangeCodeForAccessToken,
  fetchAuthenticatedGitHubUser,
} from '../../services/githubOAuthService.js'
import { findOrCreateUserFromGitHubProfile } from '../../services/userService.js'
import { createSessionCookieHeader } from '../../services/sessionService.js'
import { buildCorsHeaders } from '../../config/cors.js'
import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'

function redirectToFrontendError(reason) {
  return {
    statusCode: 302,
    headers: {
      Location: `${env.appBaseUrl()}/?auth_error=${encodeURIComponent(reason)}`,
      ...buildCorsHeaders(),
    },
    body: '',
  }
}

// GET /auth/github/callback?code=...&state=...
//
// This endpoint is only ever reached via a full-page browser redirect from
// GitHub, never via `fetch` from the SPA — so unlike every other handler, it
// deliberately does NOT use withErrorHandling/return a JSON error body on
// failure. A JSON error page would be a confusing dead end for the user;
// instead every failure redirects back into the frontend with a safe,
// generic `auth_error` reason code the Landing page can show.
export const handler = async (event) => {
  try {
    const { code, state } = event.queryStringParameters ?? {}
    if (!code || !state) {
      return redirectToFrontendError('missing_parameters')
    }

    const statePayload = verifyOAuthState(state)
    if (!statePayload) {
      return redirectToFrontendError('invalid_state')
    }

    const accessToken = await exchangeCodeForAccessToken(code)
    const githubProfile = await fetchAuthenticatedGitHubUser(accessToken)
    const user = await findOrCreateUserFromGitHubProfile(githubProfile, accessToken)

    const redirectTo = statePayload.redirectTo ?? '/projects'
    return {
      statusCode: 302,
      headers: {
        Location: `${env.appBaseUrl()}${redirectTo}`,
        'Set-Cookie': createSessionCookieHeader(user),
        ...buildCorsHeaders(),
      },
      body: '',
    }
  } catch (err) {
    logger.error('GitHub OAuth callback failed', {
      errorMessage: err instanceof Error ? err.message : String(err),
    })
    return redirectToFrontendError('oauth_failed')
  }
}
