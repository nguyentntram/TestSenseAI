// API service layer. Re-exports exactly one implementation based on
// VITE_API_MODE — real (backend/) or mock (in-memory demo data) — chosen
// wholesale in src/config/apiConfig.js. Pages import from this file only,
// never from realApi.js/mockApi.js directly, so the mode switch stays in
// one place and the two implementations never blend within a single call.
import { API_MODE } from '../config/apiConfig.js'
import * as realApi from './realApi.js'
import * as mockApi from './mockApi.js'

const impl = API_MODE === 'mock' ? mockApi : realApi

export const beginGitHubLogin = impl.beginGitHubLogin
export const getCurrentUser = impl.getCurrentUser
export const logout = impl.logout
export const getRepositories = impl.getRepositories
export const getProjects = impl.getProjects
export const getProjectById = impl.getProjectById
export const createProject = impl.createProject
export const updateProject = impl.updateProject
export const deleteProject = impl.deleteProject
