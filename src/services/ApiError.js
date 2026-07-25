// Thrown by realApi.js for any non-2xx backend response. Pages branch on
// `status`/`code` (e.g. 401 -> "show sign-in", 404 -> "not found") instead
// of parsing error messages.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
