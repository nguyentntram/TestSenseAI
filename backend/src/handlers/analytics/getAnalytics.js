import { withErrorHandling } from '../../middleware/withErrorHandling.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { getProject } from '../../services/projectService.js'
import { getProjectAnalytics, getMemoryEntriesByProjectId } from '../../../shared/db-client.js'
import { toMemoryEntryDto } from '../../utils/serializers.js'
import { successResponse } from '../../utils/response.js'

// GET /projects/:projectId/analytics
export const handler = withErrorHandling(async (event) => {
  const userId = requireAuth(event)
  const projectId = event.pathParameters?.projectId
  await getProject(projectId, userId)

  const [analytics, memoryRows] = await Promise.all([
    getProjectAnalytics(projectId),
    getMemoryEntriesByProjectId(projectId),
  ])

  const { feedback, memoryCount } = analytics
  const acceptanceRate = feedback.total > 0 ? feedback.accepted / feedback.total : 0

  return successResponse({
    memoryCount,
    retrievalHits: 0,
    avgSimilarity: 0,
    acceptanceRate,
    similarExamples: [],
    memoryEntries: memoryRows.map(toMemoryEntryDto),
  })
})
