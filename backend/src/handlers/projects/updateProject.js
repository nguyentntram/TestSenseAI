import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { updateProject } from '../../services/projectService.js'
import { successResponse } from '../../utils/response.js'
import { parseJsonBody } from '../../utils/validation.js'

// PATCH /projects/{projectId}
// Body: any subset of { name, description, defaultBranch, testFramework,
//                        memoryIndexingEnabled }
// Same 404-for-not-yours policy as getProject.js.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projectId = event.pathParameters?.projectId
  const input = parseJsonBody(event.body)
  const project = await updateProject(projectId, userId, input)
  return successResponse(project)
})
