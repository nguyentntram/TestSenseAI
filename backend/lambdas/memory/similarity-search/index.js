import { generateEmbedding } from '../../../shared/bedrock-client.js'
import {
  searchSimilarEmbeddings,
  getRetrievalConfig,
  getPullRequestById,
  getChangedFilesByPrId,
} from '../../../shared/db-client.js'

export const handler = async (event) => {
  const { projectId, queryText: rawQueryText, prId, topK: eventTopK, minSimilarity: eventMinSimilarity } = event

  if (!projectId || (!rawQueryText && !prId)) {
    return res(400, { error: 'projectId and either queryText or prId are required' })
  }

  // Build query text from PR data when called from Step Functions (prId given, no queryText)
  let queryText = rawQueryText
  if (!queryText && prId) {
    const [pr, files] = await Promise.all([
      getPullRequestById(prId),
      getChangedFilesByPrId(prId),
    ])
    if (!pr) return res(404, { error: `PR ${prId} not found` })
    const filePaths = files.map(f => f.path).join(', ')
    queryText = `${pr.title}\n\nChanged files: ${filePaths}`
  }

  // Load per-project tuning config; event-level params override DB config
  const config = await getRetrievalConfig(projectId)
  const topK = eventTopK ?? config.topK
  const minSimilarity = eventMinSimilarity ?? config.minSimilarity

  const queryEmbedding = await generateEmbedding(queryText)
  // Fetch 2× topK from DB so we have headroom after filtering by minSimilarity
  const raw = await searchSimilarEmbeddings(projectId, queryEmbedding, topK * 2)
  const filtered = raw.filter(r => r.similarity >= minSimilarity).slice(0, topK)

  // Structured quality log — queryable via CloudWatch Logs Insights
  const similarities = raw.map(r => r.similarity)
  console.log(JSON.stringify({
    event: 'similarity_search',
    projectId,
    queryLength: queryText.length,
    topK,
    minSimilarity,
    rawResults: raw.length,
    filteredResults: filtered.length,
    avgSimilarity: similarities.length
      ? (similarities.reduce((a, b) => a + b, 0) / similarities.length).toFixed(3)
      : null,
    topSimilarity: similarities[0]?.toFixed(3) ?? null,
  }))

  const payload = {
    projectId,
    results: filtered.map(r => ({
      id: r.id,
      sourceRef: r.source_ref,
      testCode: r.test_code,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
    meta: { topK, minSimilarity, rawCount: raw.length, filteredCount: filtered.length },
  }
  // Step Functions invocations have no httpMethod; return raw object so the
  // ASL can reference $.similarityResult.results directly without JSON parsing.
  return event.httpMethod ? res(200, payload) : payload
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
