import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { findUserById } from '../../services/userService.js'
import { toUserDto } from '../../utils/serializers.js'
import { successResponse } from '../../utils/response.js'
import { NotFoundError } from '../../utils/errors.js'

// GET /auth/me
// Returns the signed-in user's profile, or 401 if there is no valid session
// cookie. The frontend treats a 401 here as "signed out", not an error.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const user = await findUserById(userId)
  if (!user) {
    throw new NotFoundError('User was not found.', 'USER_NOT_FOUND')
  }
  return successResponse(toUserDto(user))
})
