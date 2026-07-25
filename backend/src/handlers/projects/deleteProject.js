import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { deleteProject } from '../../services/projectService.js'
import { noContentResponse } from '../../utils/response.js'

// DELETE /projects/{projectId}
// Same 404-for-not-yours policy as getProject.js.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projectId = event.pathParameters?.projectId
  await deleteProject(projectId, userId)
  return noContentResponse()
})
