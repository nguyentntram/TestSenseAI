// Real backend implementation of the API service. Talks to the Node/Lambda
// backend in `backend/` over HTTP. The session lives in an HttpOnly cookie
// set by the backend — this file never reads or stores a token itself, and
// none of these functions ever put a GitHub token in localStorage or any
// other place the React app can read.
import { API_BASE_URL } from '../config/apiConfig.js'
import { ApiError } from './ApiError.js'

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include', // sends the HttpOnly session cookie
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) return null

  let payload = null
  try {
    payload = await response.json()
  } catch {
    // Non-JSON body (e.g. the backend is unreachable and something else,
    // like a dev proxy, answered instead). Treated as a generic failure below.
  }

  if (!response.ok) {
    const code = payload?.error?.code ?? 'UNKNOWN_ERROR'
    const message = payload?.error?.message ?? 'Something went wrong. Please try again.'
    throw new ApiError(response.status, code, message)
  }

  return payload?.data ?? null
}

export function beginGitHubLogin(redirectTo = '/projects') {
  window.location.href = `${API_BASE_URL}/auth/github/login?redirect_to=${encodeURIComponent(redirectTo)}`
}

export async function getCurrentUser() {
  try {
    return await request('/auth/me')
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' })
}

export async function getRepositories() {
  return request('/repositories')
}

export async function getProjects() {
  return request('/projects')
}

export async function getProjectById(projectId) {
  try {
    return await request(`/projects/${encodeURIComponent(projectId)}`)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function createProject(projectData) {
  return request('/projects', { method: 'POST', body: projectData })
}

export async function updateProject(projectId, projectData) {
  return request(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: projectData,
  })
}

export async function deleteProject(projectId) {
  await request(`/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' })
}
