import { ValidationError } from './errors.js'

export function requireString(value, fieldName, { maxLength = 255 } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`"${fieldName}" is required and must be a non-empty string.`)
  }
  if (value.length > maxLength) {
    throw new ValidationError(`"${fieldName}" must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

export function optionalString(value, fieldName, { maxLength = 1000 } = {}) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') {
    throw new ValidationError(`"${fieldName}" must be a string.`)
  }
  if (value.length > maxLength) {
    throw new ValidationError(`"${fieldName}" must be ${maxLength} characters or fewer.`)
  }
  return value.trim()
}

export function requireInteger(value, fieldName) {
  const numeric = Number(value)
  if (!Number.isInteger(numeric)) {
    throw new ValidationError(`"${fieldName}" is required and must be an integer.`)
  }
  return numeric
}

export function requireBoolean(value, fieldName) {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`"${fieldName}" must be a boolean.`)
  }
  return value
}

export function parseJsonBody(rawBody) {
  if (!rawBody) return {}
  try {
    return JSON.parse(rawBody)
  } catch {
    throw new ValidationError('Request body must be valid JSON.')
  }
}
