import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { getGeneratedTestById } from '../../../shared/db-client.js'
import { chat } from '../../../shared/bedrock-client.js'
import { successResponse } from '../../utils/response.js'
import { NotFoundError, ValidationError } from '../../utils/errors.js'

// POST /projects/:projectId/generated-tests/:testId/chat
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const { projectId, testId } = event.pathParameters
  await getProject(projectId, userId)

  const row = await getGeneratedTestById(testId, projectId)
  if (!row) throw new NotFoundError('Test not found.', 'TEST_NOT_FOUND')

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch { throw new ValidationError('Invalid JSON body.') }

  const { message, history = [] } = body
  if (!message?.trim()) throw new ValidationError('message is required.')

  const system = `You are a helpful assistant explaining a generated unit test.

Test title: ${row.title}
Why this test was generated: ${row.reasoning}

Test code:
\`\`\`
${row.test_code}
\`\`\`

Answer questions about this test concisely and accurately.`

  const messages = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: message },
  ]

  const reply = await chat({ messages, system })
  return successResponse({ reply })
})
