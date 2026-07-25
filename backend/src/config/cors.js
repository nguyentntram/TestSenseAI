import { env } from './env.js'

// Local-dev-friendly CORS. In a real API Gateway deployment, these same
// values should be mirrored in the Gateway's CORS configuration (or a
// Lambda@Edge / authorizer response) — this module is what the local dev
// server and the Lambda handler both use directly.
export function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': env.corsAllowedOrigin(),
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  }
}
