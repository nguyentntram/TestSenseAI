import { getProjectAnalytics } from '../../../shared/db-client.js'

export const handler = async (event) => {
  const projectId = event.pathParameters?.projectId ?? event.projectId

  if (!projectId) return res(400, { error: 'projectId is required' })

  const analytics = await getProjectAnalytics(projectId)
  if (!analytics) return res(404, { error: 'Project not found' })

  return res(200, { analytics })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
