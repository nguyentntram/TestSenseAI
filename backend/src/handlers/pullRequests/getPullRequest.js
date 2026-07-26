import { requireAuth } from '../../middleware/requireAuth.js'
import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { successResponse, errorResponse } from '../../utils/response.js'
import { getProjectById, getPullRequestById } from '../../../shared/db-client.js'
import { toPullRequestDto } from '../../utils/serializers.js'

export const handler = withErrorHandling(async (event) => {
  const userId = await requireAuth(event)
  const { projectId, prId } = event.pathParameters ?? {}
  if (!projectId || !prId) return errorResponse(400, 'MISSING_PARAM', 'projectId and prId are required')

  const project = await getProjectById(projectId)
  if (!project) return errorResponse(404, 'NOT_FOUND', 'Project not found')
  if (project.user_id !== userId) return errorResponse(403, 'FORBIDDEN', 'Access denied')

  const pr = await getPullRequestById(prId)
  if (!pr || pr.project_id !== project.id) return errorResponse(404, 'NOT_FOUND', 'Pull request not found')

  return successResponse({ pullRequest: toPullRequestDto(pr) })
})
