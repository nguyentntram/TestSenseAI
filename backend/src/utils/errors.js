// Typed application errors. Each carries an HTTP status and a stable string
// code so the frontend can branch on `error.code` instead of parsing
// messages. Thrown anywhere in a handler/service, these are turned into the
// consistent { error: { code, message } } JSON shape by
// middleware/withErrorHandling.js — never leak stack traces or raw
// exception messages from unexpected errors.

export class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid input.') {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication is required.') {
    super(401, 'UNAUTHENTICATED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource.') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource was not found.', code = 'NOT_FOUND') {
    super(404, code, message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists.', code = 'CONFLICT') {
    super(409, code, message)
  }
}
