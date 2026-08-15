import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { getGeneratedTestById } from '../../../shared/db-client.js'
import { toGeneratedTestDto } from '../../utils/serializers.js'
import { successResponse } from '../../utils/response.js'
import { NotFoundError } from '../../utils/errors.js'

// GET /projects/:projectId/generated-tests/:testId
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const { projectId, testId } = event.pathParameters
  await getProject(projectId, userId)
  const row = await getGeneratedTestById(testId, projectId)
  if (!row) throw new NotFoundError('Test not found.', 'TEST_NOT_FOUND')
  return successResponse(toGeneratedTestDto(row))
})
