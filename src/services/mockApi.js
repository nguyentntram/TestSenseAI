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

const DEMO_USER = {
  id: 'demo-user',
  githubUsername: 'demo-user',
  githubEmail: 'demo-user@example.com',
  avatarUrl: null,
  createdAt: new Date().toISOString(),
}

// Mutable in-memory copies so createProject/updateProject/deleteProject can
// demonstrate real CRUD behavior without a backend. Resets on page reload.
let mockProjects = seedProjects.map((project) => ({ ...project }))
let mockCurrentUser = null

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

const CHAT_RESPONSES = [
  (msg, test) => {
    if (/why|reason|purpose/i.test(msg))
      return `This test was generated because the PR touched code paths that weren't previously covered. ${test?.reasoning ? `Specifically: ${test.reasoning}` : 'The analysis detected missing branch coverage in the changed files.'}`
    return null
  },
  (msg) => {
    if (/edge case|boundary|corner/i.test(msg))
      return 'The edge cases covered here include null inputs, empty collections, and off-by-one boundary values that were visible in the diff. If you want additional edge cases, consider inputs like very large numbers, Unicode strings, or concurrent access patterns depending on your code.'
    return null
  },
  (msg) => {
    if (/mock|stub|spy|fake/i.test(msg))
      return 'The mocks used in this test isolate the unit under test by replacing its external dependencies — database calls, HTTP requests, and timers — with controlled fakes. This keeps the test fast and deterministic.'
    return null
  },
  (msg) => {
    if (/coverage|cover|what does/i.test(msg))
      return 'This test covers the happy path and the two most common failure branches. It exercises the function with valid input, an empty-state input, and an input that triggers the error handler.'
    return null
  },
  (msg) => {
    if (/improve|better|suggest|change|update/i.test(msg))
      return "One improvement would be to add a test for the async timeout path if your implementation has one. You could also parametrize the happy-path inputs using `test.each` to cover more value combinations with less repetition."
    return null
  },
  (msg) => {
    if (/run|execute|how to/i.test(msg))
      return 'Copy the test code into your test directory, then run `npm test -- --testPathPattern=<filename>` (Jest) or `npx vitest run <filename>` (Vitest). Make sure the mock dependencies are importable in your test environment.'
    return null
  },
  (_msg, test) =>
    `Good question about "${test?.title ?? 'this test'}". Based on the PR diff and the existing test patterns in your codebase, this covers the most impactful scenario. Is there a specific aspect of the implementation you'd like me to explain further?`,
]

export async function chatAboutTest(_projectId, _testId, { message, test }) {
  await delay(900 + Math.random() * 600)
  for (const responder of CHAT_RESPONSES) {
    const reply = responder(message, test)
    if (reply) return { reply }
  }
  return { reply: 'I can help explain this test. Could you be more specific about what you would like to know?' }
}
