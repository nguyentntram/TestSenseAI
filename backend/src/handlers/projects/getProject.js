import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { successResponse } from '../../utils/response.js'

// GET /projects/{projectId}
//
// Security policy: a project that doesn't exist and a project that exists
// but belongs to a different user both return 404 PROJECT_NOT_FOUND, never
// 403. This is deliberate — returning 403 for "exists but not yours" would
// let a caller enumerate other users' project ids by observing 403 vs 404.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projectId = event.pathParameters?.projectId
  const project = await getProject(projectId, userId)
  return successResponse(project)
})
