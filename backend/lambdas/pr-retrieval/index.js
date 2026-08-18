import { getSecret } from '../../shared/secrets-manager.js'
import { GitHubClient } from '../../shared/github-client.js'
import { upsertChangedFiles, updateWebhookStatus, storePrDiff, getProjectById, getUserById } from '../../shared/db-client.js'

const MAX_DIFF_BYTES = 500_000  // 500 KB
const MAX_FILES = 300
const MAX_RETRIES = 3

async function withRetry(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const isTransient = err.status === 429 || err.status === 403 || (err.status ?? 0) >= 500
      if (isTransient && attempt < MAX_RETRIES) {
        const backoffMs = Math.pow(2, attempt) * 1000
        console.warn(`${label}: attempt ${attempt} failed (${err.status ?? err.message}), retrying in ${backoffMs}ms`)
        await new Promise(r => setTimeout(r, backoffMs))
        continue
      }
      throw err
    }
  }
}

export const handler = async (event) => {
  const { prId, projectId, prNumber, repositoryFullName } = event

  console.log(`PR retrieval started: PR #${prNumber} (${repositoryFullName})`)

  try {
    const [owner, repo] = repositoryFullName.split('/')

    // The GitHub token belongs to the project owner, not the project itself —
    // stored under users.oauth_secret_reference at sign-in time (see
    // backend/src/services/secrets/secretsService.js). Reuse that reference
    // rather than guessing a secret name here; the two must never diverge.
    const project = await getProjectById(projectId)
    if (!project) throw new Error(`Project ${projectId} not found`)
    const user = await getUserById(project.user_id)
    if (!user?.oauth_secret_reference) {
      throw new Error(`No GitHub token on file for project ${projectId}'s owner`)
    }
    const token = await getSecret(user.oauth_secret_reference)
    const github = new GitHubClient(token)

    const [allFiles, diff] = await Promise.all([
      withRetry(() => github.getPullRequestFiles(owner, repo, prNumber), `files:PR#${prNumber}`),
      withRetry(() => github.getPullRequestDiff(owner, repo, prNumber), `diff:PR#${prNumber}`),
    ])

    // Cap file count to avoid overwhelming the prompt
    const files = allFiles.length > MAX_FILES
      ? (() => {
          console.warn(`PR #${prNumber} has ${allFiles.length} files — capped at ${MAX_FILES}`)
          return allFiles.slice(0, MAX_FILES)
        })()
      : allFiles

    // Truncate oversized diffs with a clear marker
    let finalDiff = diff
    if (diff.length > MAX_DIFF_BYTES) {
      console.warn(`PR #${prNumber} diff is ${diff.length} bytes — truncating to ${MAX_DIFF_BYTES}`)
      finalDiff = diff.slice(0, MAX_DIFF_BYTES) + '\n\n[diff truncated — exceeded 500 KB limit]'
    }

    await upsertChangedFiles(prId, files)
    await storePrDiff(prId, finalDiff)
    console.log(`Stored ${files.length} files + ${finalDiff.length}B diff for PR #${prNumber}`)

    await updateWebhookStatus(prId, 'analyzed')
    console.log(`PR #${prNumber} marked as analyzed`)

    return { prId, filesCount: files.length, diffBytes: finalDiff.length, status: 'analyzed' }
  } catch (err) {
    console.error(`PR retrieval failed for PR #${prNumber}:`, err)
    await updateWebhookStatus(prId, 'failed').catch(() => {})
    throw err
  }
}
