import { getProjectById, deleteProject } from '../../../shared/db-client.js'

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId
  if (!userId) return res(401, { error: 'Unauthorized' })

  const projectId = event.pathParameters?.projectId
  if (!projectId) return res(400, { error: 'Missing projectId' })

  const project = await getProjectById(projectId)
  if (!project) return res(404, { error: 'Project not found' })
  if (project.user_id !== userId) return res(403, { error: 'Forbidden' })

  await deleteProject(projectId, userId)
  console.log(`Deleted project ${projectId}`)

  return res(204, {})
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
