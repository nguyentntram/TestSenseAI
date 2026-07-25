import { buildCorsHeaders } from '../config/cors.js'

function baseHeaders(extraHeaders = {}) {
  return {
    'Content-Type': 'application/json',
    ...buildCorsHeaders(),
    ...extraHeaders,
  }
}

export function successResponse(data, { statusCode = 200, headers = {} } = {}) {
  return {
    statusCode,
    headers: baseHeaders(headers),
    body: JSON.stringify({ data }),
  }
}

export function errorResponse(statusCode, code, message, { headers = {} } = {}) {
  return {
    statusCode,
    headers: baseHeaders(headers),
    body: JSON.stringify({ error: { code, message } }),
  }
}

export function noContentResponse({ headers = {} } = {}) {
  return {
    statusCode: 204,
    headers: baseHeaders(headers),
    body: '',
  }
}
