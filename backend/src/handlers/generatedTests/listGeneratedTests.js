import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { getGeneratedTestsByProjectId } from '../../../shared/db-client.js'
import { toGeneratedTestDto } from '../../utils/serializers.js'
import { successResponse } from '../../utils/response.js'

// GET /projects/:projectId/generated-tests
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projectId = event.pathParameters?.projectId
  await getProject(projectId, userId)
  const rows = await getGeneratedTestsByProjectId(projectId)
  return successResponse(rows.map(toGeneratedTestDto))
})
