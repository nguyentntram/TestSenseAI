import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { findUserById, getUserGitHubToken } from '../../services/userService.js'
import { listRepositoriesForUser } from '../../services/githubRepositoryService.js'
import { successResponse } from '../../utils/response.js'
import { NotFoundError } from '../../utils/errors.js'

// GET /repositories
// Lists the authenticated user's GitHub repositories, for the
// connect-repository "select a repository" step. Requires a valid session;
// the actual GitHub call uses the token retrieved from Secrets Manager, not
// anything passed by the client.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const user = await findUserById(userId)
  if (!user) {
    throw new NotFoundError('User was not found.', 'USER_NOT_FOUND')
  }

  const accessToken = await getUserGitHubToken(user)
  const repositories = await listRepositoriesForUser(accessToken)
  return successResponse(repositories)
})
