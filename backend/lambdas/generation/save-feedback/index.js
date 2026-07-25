import { saveFeedback } from '../../../shared/db-client.js'

const VALID_ACTIONS = new Set(['accept', 'modify', 'reject'])

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId
  if (!userId) return res(401, { error: 'Unauthorized' })

  const testId = event.pathParameters?.testId
  if (!testId) return res(400, { error: 'Missing testId' })

  let body
  try { body = JSON.parse(event.body ?? '{}') } catch { return res(400, { error: 'Invalid JSON' }) }

  const { action, editedCode } = body
  if (!action || !VALID_ACTIONS.has(action)) {
    return res(400, { error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}` })
  }

  if (action === 'modify' && !editedCode?.trim()) {
    return res(400, { error: 'editedCode is required when action is modify' })
  }

  const feedbackId = await saveFeedback({ testId, userId, action, editedCode })
  console.log(`Feedback saved: test=${testId} action=${action} user=${userId}`)

  return res(200, { feedbackId, testId, action })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
