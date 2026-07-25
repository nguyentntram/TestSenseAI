import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { createLogoutCookieHeader } from '../../services/sessionService.js'
import { successResponse } from '../../utils/response.js'

// POST /auth/logout
// Clears the session cookie. This does not revoke the underlying GitHub
// OAuth token or invalidate any other cookie already issued to the same
// user (see the limitation noted in services/sessionService.js).
export const handler = withErrorHandling(async () => {
  return successResponse(
    { loggedOut: true },
    { headers: { 'Set-Cookie': createLogoutCookieHeader() } },
  )
})
