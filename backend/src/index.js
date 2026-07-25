import { routes } from './config/routes.js'
import { matchRoute } from './utils/router.js'
import { errorResponse } from './utils/response.js'
import { buildCorsHeaders } from './config/cors.js'

// Lambda entrypoint. Deploy this behind a single API Gateway REST API
// resource using a {proxy+} path + ANY method, with Lambda proxy
// integration — every request (any method, any path under the API) lands
// here and gets dispatched via the shared route table in config/routes.js.
export async function handler(event, context) {
  const method = event.httpMethod
  const path = event.path ?? '/'

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: buildCorsHeaders(), body: '' }
  }

  const match = matchRoute(routes, method, path)
  if (!match) {
    return errorResponse(404, 'ROUTE_NOT_FOUND', `No route for ${method} ${path}.`)
  }

  const enrichedEvent = {
    ...event,
    pathParameters: { ...event.pathParameters, ...match.pathParameters },
  }
  return match.handler(enrichedEvent, context)
}
