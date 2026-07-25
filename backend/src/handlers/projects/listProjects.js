import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { listProjects } from '../../services/projectService.js'
import { successResponse } from '../../utils/response.js'

// GET /projects
// Returns only the authenticated user's own projects (query is user-scoped
// at the repository layer, not just filtered here).
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projects = await listProjects(userId)
  return successResponse(projects)
})
