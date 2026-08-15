import { handler as loginHandler } from '../handlers/auth/login.js'
import { handler as callbackHandler } from '../handlers/auth/callback.js'
import { handler as meHandler } from '../handlers/auth/me.js'
import { handler as logoutHandler } from '../handlers/auth/logout.js'
import { handler as listRepositoriesHandler } from '../handlers/repositories/listRepositories.js'
import { handler as listProjectsHandler } from '../handlers/projects/listProjects.js'
import { handler as createProjectHandler } from '../handlers/projects/createProject.js'
import { handler as getProjectHandler } from '../handlers/projects/getProject.js'
import { handler as updateProjectHandler } from '../handlers/projects/updateProject.js'
import { handler as deleteProjectHandler } from '../handlers/projects/deleteProject.js'
import { handler as listPullRequestsHandler } from '../handlers/pullRequests/listPullRequests.js'
import { handler as getPullRequestHandler } from '../handlers/pullRequests/getPullRequest.js'
import { handler as getAnalyticsHandler } from '../handlers/analytics/getAnalytics.js'
import { handler as listGeneratedTestsHandler } from '../handlers/generatedTests/listGeneratedTests.js'
import { handler as getGeneratedTestHandler } from '../handlers/generatedTests/getGeneratedTest.js'
import { handler as submitFeedbackHandler } from '../handlers/generatedTests/submitFeedback.js'
import { handler as chatAboutTestHandler } from '../handlers/generatedTests/chatAboutTest.js'

// One route table drives both the local dev server (src/localServer.js) and
// the deployed Lambda entrypoint (src/index.js). In a real API Gateway REST
// API, this maps to one resource + method per entry below, all proxying to
// the same Lambda function (a single {proxy+} resource) — see docs/API.md.
export const routes = [
  { method: 'GET', path: '/auth/github/login', handler: loginHandler },
  { method: 'GET', path: '/auth/github/callback', handler: callbackHandler },
  { method: 'GET', path: '/auth/me', handler: meHandler },
  { method: 'POST', path: '/auth/logout', handler: logoutHandler },

  { method: 'GET', path: '/repositories', handler: listRepositoriesHandler },

  { method: 'GET', path: '/projects', handler: listProjectsHandler },
  { method: 'POST', path: '/projects', handler: createProjectHandler },
  { method: 'GET', path: '/projects/:projectId', handler: getProjectHandler },
  { method: 'PATCH', path: '/projects/:projectId', handler: updateProjectHandler },
  { method: 'DELETE', path: '/projects/:projectId', handler: deleteProjectHandler },

  { method: 'GET', path: '/projects/:projectId/pull-requests', handler: listPullRequestsHandler },
  { method: 'GET', path: '/projects/:projectId/pull-requests/:prId', handler: getPullRequestHandler },

  { method: 'GET', path: '/projects/:projectId/analytics', handler: getAnalyticsHandler },

  { method: 'GET', path: '/projects/:projectId/generated-tests', handler: listGeneratedTestsHandler },
  { method: 'GET', path: '/projects/:projectId/generated-tests/:testId', handler: getGeneratedTestHandler },
  { method: 'POST', path: '/projects/:projectId/generated-tests/:testId/feedback', handler: submitFeedbackHandler },
  { method: 'POST', path: '/projects/:projectId/generated-tests/:testId/chat', handler: chatAboutTestHandler },
]
