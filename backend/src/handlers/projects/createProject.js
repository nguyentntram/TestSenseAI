import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { createProject } from '../../services/projectService.js'
import { successResponse } from '../../utils/response.js'
import { parseJsonBody } from '../../utils/validation.js'

// POST /projects
// Body: { repositoryOwner, repositoryName, name?, description?,
//         defaultBranch?, testFramework? }
// Verifies repository access with GitHub before creating the project, and
// is idempotent for duplicate (user, repository) connections — it returns
// the existing project instead of erroring.
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const input = parseJsonBody(event.body)
  const project = await createProject(userId, input)
  return successResponse(project, { statusCode: 201 })
})
