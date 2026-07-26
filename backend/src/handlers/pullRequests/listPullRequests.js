import { requireAuth } from '../../middleware/requireAuth.js'
import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { successResponse, errorResponse } from '../../utils/response.js'
import { getProjectById, getPullRequestsByProjectId } from '../../../shared/db-client.js'
import { toPullRequestDto } from '../../utils/serializers.js'

export const handler = withErrorHandling(async (event) => {
  const userId = await requireAuth(event)
  const { projectId } = event.pathParameters ?? {}
  if (!projectId) return errorResponse(400, 'MISSING_PARAM', 'projectId is required')

  const project = await getProjectById(projectId)
  if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found')
  if (project.user_id !== userId) return errorResponse(403, 'FORBIDDEN', 'Access denied')

  const rows = await getPullRequestsByProjectId(projectId)
  return successResponse({ pullRequests: rows.map(toPullRequestDto) })
})
