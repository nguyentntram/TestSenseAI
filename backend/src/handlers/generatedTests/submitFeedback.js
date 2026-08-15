import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { getGeneratedTestById, saveFeedback } from '../../../shared/db-client.js'
import { successResponse } from '../../utils/response.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

const VALID_ACTIONS = new Set(['accept', 'modify', 'reject'])

// POST /projects/:projectId/generated-tests/:testId/feedback
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const { projectId, testId } = event.pathParameters
  await getProject(projectId, userId)

  const row = await getGeneratedTestById(testId, projectId)
  if (!row) throw new NotFoundError('Test not found.', 'TEST_NOT_FOUND')

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch { throw new ValidationError('Invalid JSON body.') }

  const { action, editedCode } = body
  if (!action || !VALID_ACTIONS.has(action)) {
    throw new ValidationError(`action must be one of: ${[...VALID_ACTIONS].join(', ')}`)
  }
  if (action === 'modify' && !editedCode?.trim()) {
    throw new ValidationError('editedCode is required when action is modify.')
  }

  const feedbackId = await saveFeedback({ testId, userId, action, editedCode })
  return successResponse({ feedbackId, testId, action })
})
