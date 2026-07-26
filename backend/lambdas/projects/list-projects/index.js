import { getProjectsByUserId } from '../../../shared/db-client.js'

export const handler = async (event) => {
  const userId = event.requestContext?.authorizer?.userId ?? event.queryStringParameters?.userId
  if (!userId) return res(401, { error: 'Unauthorized' })

  const projects = await getProjectsByUserId(userId)
  return res(200, { projects })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
