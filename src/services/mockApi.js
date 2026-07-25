// Explicit mock/demo implementation of the API service — no network calls,
// no real GitHub or backend involved. Selected only when VITE_API_MODE=mock
// (see src/config/apiConfig.js and src/services/api.js). Useful for
// frontend-only demos when the backend/database aren't running, but is
// never mixed with real data: api.js exports one implementation or the
// other, in full.
import { projects as seedProjects } from '../data/projects.js'
import { repositories } from '../data/repositories.js'
import { getSimilarExamplesForPr } from '../data/similarExamples.js'

const MOCK_DELAY_MS = 400

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mutable in-memory copies so createProject/updateProject/deleteProject can
// demonstrate real CRUD behavior without a backend. Resets on page reload.
let mockProjects = seedProjects.map((project) => ({ ...project }))
let mockCurrentUser = null

const DEMO_USER = {
  id: 'demo-user',
  githubUsername: 'demo-user',
  githubEmail: 'demo-user@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
}

export async function beginGitHubLogin() {
  // No real OAuth in mock mode — signs in as a canned demo user instead of
  // performing any redirect. Call getCurrentUser() again afterward to pick
  // this up, exactly as you would after the real redirect-based flow.
  await delay()
  mockCurrentUser = DEMO_USER
}

export async function getCurrentUser() {
  await delay()
  return mockCurrentUser
}

export async function logout() {
  await delay()
  mockCurrentUser = null
}

export async function getRepositories() {
  await delay()
  return repositories
}

export async function getProjects() {
  await delay()
  return mockProjects
}

export async function getProjectById(projectId) {
  await delay()
  return mockProjects.find((project) => project.id === projectId) ?? null
}

export async function createProject(projectData) {
  await delay(800)
  const repository = projectData.repository ?? {}
  const newProject = {
    id: repository.name ? `${repository.name}-${Date.now()}` : `project-${Date.now()}`,
    name: projectData.name || repository.name || 'Untitled project',
    repositoryFullName: repository.fullName ?? 'demo-org/demo-repo',
    description: projectData.description ?? '',
    language: repository.language ?? 'Unknown',
    testFramework: projectData.testFramework ?? '',
    defaultBranch: projectData.defaultBranch || repository.defaultBranch || 'main',
    memoryCount: 0,
    openPullRequests: 0,
    syncStatus: 'synced',
    lastSyncedAt: new Date().toISOString(),
    metrics: { testsGenerated: 0, coverageEstimate: 'n/a', pullRequestsAnalyzed: 0 },
    pullRequests: [],
    memoryEntries: [],
    generatedTests: [],
    recentActivity: [],
  }
  mockProjects = [newProject, ...mockProjects]
  return newProject
}

export async function updateProject(projectId, projectData) {
  await delay()
  let updated = null
  mockProjects = mockProjects.map((project) => {
    if (project.id !== projectId) return project
    updated = { ...project, ...projectData }
    return updated
  })
  return updated
}

export async function deleteProject(projectId) {
  await delay()
  mockProjects = mockProjects.filter((project) => project.id !== projectId)
}

// PR ingestion (Han) — reads the same mutable mockProjects array so mock
// mode stays consistent with whatever a demo has created/edited.
export async function getPullRequestsByProjectId(projectId) {
  await delay()
  const project = mockProjects.find((p) => p.id === projectId) ?? null
  return project ? (project.pullRequests ?? []) : null
}

export async function getPullRequestById(projectId, prId) {
  await delay()
  const project = mockProjects.find((p) => p.id === projectId) ?? null
  if (!project) return null
  return (project.pullRequests ?? []).find((pr) => pr.id === prId) ?? null
}

// Memory/retrieval (Trung) — hand-written mock results, see
// src/data/similarExamples.js. Return shape (array of
// { id, score, type, title, source, snippet }) is what the real
// similarity-search endpoint is expected to match.
export async function getSimilarExamples(_projectId, prId) {
  await delay()
  return getSimilarExamplesForPr(prId)
}

export async function getAnalyticsByProjectId(projectId) {
  await delay()
  const project = mockProjects.find((p) => p.id === projectId) ?? null
  if (!project || !project.analytics) return null
  return {
    ...project.analytics,
    memoryEntries: project.memoryEntries ?? [],
  }
}

// Test generation & feedback (Anh)
export async function getGeneratedTestsByProjectId(projectId) {
  await delay()
  const project = mockProjects.find((p) => p.id === projectId) ?? null
  return project ? (project.generatedTests ?? []) : null
}

export async function getGeneratedTestById(projectId, testId) {
  await delay()
  const project = mockProjects.find((p) => p.id === projectId) ?? null
  if (!project) return null
  return (project.generatedTests ?? []).find((t) => t.id === testId) ?? null
}

export async function saveFeedback(_projectId, testId, { action, editedCode }) {
  await delay(300)
  return { testId, action, editedCode, savedAt: new Date().toISOString() }
}
