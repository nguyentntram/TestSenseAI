import { getSecretJson } from '../../../shared/secrets-manager.js'
import { GitHubClient } from '../../../shared/github-client.js'
import { getProjectById, insertTestEmbedding, updateProjectSyncStatus, getIndexedSourceRefs } from '../../../shared/db-client.js'
import { generateEmbedding } from '../../../shared/bedrock-client.js'

const MAX_PRS_PER_RUN = 50  // Limit per invocation to stay within Lambda timeout

export const handler = async (event) => {
  const { projectId, page = 1 } = event

  const project = await getProjectById(projectId)
  if (!project) throw new Error(`Project ${projectId} not found`)

  await updateProjectSyncStatus(projectId, 'syncing')

  const { access_token } = await getSecretJson(
    `${process.env.SECRETS_PREFIX}/projects/${projectId}/oauth-token`,
  )
  const github = new GitHubClient(access_token)
  const [owner, repo] = project.repository_full_name.split('/')

  const mergedPRs = await github.listMergedPRs(owner, repo, { perPage: MAX_PRS_PER_RUN, page })
  const actuallyMerged = mergedPRs.filter((pr) => pr.merged_at !== null)

  // Incremental ingestion — skip PRs already in test_embeddings
  const alreadyIndexed = await getIndexedSourceRefs(projectId)
  const toIngest = actuallyMerged.filter(pr => !alreadyIndexed.has(`PR-${pr.number}`))

  console.log(`Page ${page}: ${toIngest.length} new PRs to ingest (${actuallyMerged.length - toIngest.length} already indexed) for ${project.repository_full_name}`)

  let ingested = 0
  for (const pr of toIngest) {
    try {
      // Fetch the changed files to build a rich text representation for embedding
      const files = await github.getPullRequestFiles(owner, repo, pr.number)
      const textForEmbedding = buildEmbeddingText(pr, files)

      const embedding = await generateEmbedding(textForEmbedding)

      await insertTestEmbedding({
        projectId,
        sourceRef: `PR-${pr.number}`,
        testCode: textForEmbedding,
        embedding,
        metadata: {
          prNumber: pr.number,
          prTitle: pr.title,
          mergedAt: pr.merged_at,
          filesChanged: files.map((f) => f.filename),
        },
      })
      ingested++
    } catch (err) {
      console.error(`Failed to ingest PR #${pr.number}:`, err.message)
    }
  }

  await updateProjectSyncStatus(projectId, 'synced')
  console.log(`Ingested ${ingested}/${actuallyMerged.length} PRs`)

  // If there are more pages, return a continuation token for Step Functions to re-invoke
  const hasMore = actuallyMerged.length === MAX_PRS_PER_RUN
  return { projectId, ingested, page, hasMore, nextPage: hasMore ? page + 1 : null }
}

function buildEmbeddingText(pr, files) {
  const filePaths = files.map((f) => f.filename).join(', ')
  const patches = files
    .filter((f) => f.patch)
    .map((f) => `# ${f.filename}\n${f.patch}`)
    .join('\n\n')

  return `PR: ${pr.title}\n\nFiles: ${filePaths}\n\n${patches}`.slice(0, 8000)
}
