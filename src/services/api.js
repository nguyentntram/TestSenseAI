// Placeholder API service layer.
//
// Every function here returns mock data behind a small artificial delay so
// components can already be written against async calls. When the real
// backend (API Gateway + Lambda) exists, swap the bodies of these functions
// for real `fetch`/HTTP calls without changing any call sites.

import { projects } from '../data/projects.js'
import { repositories } from '../data/repositories.js'
import { getSimilarExamplesForPr } from '../data/similarExamples.js'

const MOCK_DELAY_MS = 500

function delay(ms = MOCK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getProjects() {
  await delay()
  return projects
}

export async function getProjectById(projectId) {
  await delay()
  return projects.find((project) => project.id === projectId) ?? null
}

export async function getRepositories() {
  await delay()
  return repositories
}

export async function getPullRequestsByProjectId(projectId) {
  await delay()
  const project = projects.find((p) => p.id === projectId) ?? null
  return project ? project.pullRequests : null
}

export async function getPullRequestById(projectId, prId) {
  await delay()
  const project = projects.find((p) => p.id === projectId) ?? null
  if (!project) return null
  return project.pullRequests.find((pr) => pr.id === prId) ?? null
}

// Reads local mock data today. Once the real similarity-search endpoint
// exists (next week), swap this body for a fetch call — the return shape
// (array of { id, score, type, title, source, snippet }) is meant to stay
// the same so SimilarExamplesPanel doesn't need to change.
export async function getSimilarExamples(_projectId, prId) {
  await delay()
  return getSimilarExamplesForPr(prId)
}

export async function connectRepository(configuration) {
  await delay(1200)
  return {
    id: configuration.repository?.id ?? 'new-project',
    projectId: configuration.repository?.name ?? 'new-project',
    ...configuration,
    syncStatus: 'synced',
    connectedAt: new Date().toISOString(),
  }
}
