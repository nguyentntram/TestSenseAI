import { generateEmbedding } from '../../../shared/bedrock-client.js'
import { searchSimilarEmbeddings } from '../../../shared/db-client.js'

export const handler = async (event) => {
  const { projectId, queryText, topK = 5, minSimilarity = 0.5 } = event

  if (!projectId || !queryText) {
    return res(400, { error: 'projectId and queryText are required' })
  }

  const queryEmbedding = await generateEmbedding(queryText)
  const results = await searchSimilarEmbeddings(projectId, queryEmbedding, topK)

  // Filter by minimum similarity threshold
  const filtered = results.filter((r) => r.similarity >= minSimilarity)

  console.log(`Similarity search: ${filtered.length}/${results.length} results above threshold ${minSimilarity}`)

  return res(200, {
    results: filtered.map((r) => ({
      id: r.id,
      sourceRef: r.source_ref,
      testCode: r.test_code,
      similarity: r.similarity,
      metadata: r.metadata,
    })),
  })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
