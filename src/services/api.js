// Placeholder API service layer.
//
// Every function here returns mock data behind a small artificial delay so
// components can already be written against async calls. When the real
// backend (API Gateway + Lambda) exists, swap the bodies of these functions
// for real `fetch`/HTTP calls without changing any call sites.

import { projects } from '../data/projects.js'
import { repositories } from '../data/repositories.js'

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
