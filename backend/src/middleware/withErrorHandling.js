import { AppError } from '../utils/errors.js'
import { errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'

// Wraps a handler so every thrown error becomes the consistent
// { error: { code, message } } JSON shape, and so unexpected errors never
// leak internal details (stack traces, DB error text, secret values) to the
// client — only a generic message goes out, the real error is logged
// server-side only.
export function withErrorHandling(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context)
    } catch (err) {
      if (err instanceof AppError) {
        return errorResponse(err.statusCode, err.code, err.message)
      }

      logger.error('Unhandled error in handler', {
        path: event?.path,
        method: event?.httpMethod,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
    }
  }
}
