import { getSecretJson } from '../../shared/secrets-manager.js'
import { GitHubClient } from '../../shared/github-client.js'
import { getPullRequestById, upsertChangedFiles, updateWebhookStatus } from '../../shared/db-client.js'

export const handler = async (event) => {
  const { prId, projectId, prNumber, repositoryFullName } = event

  console.log(`PR retrieval started: PR #${prNumber} (${repositoryFullName})`)

  try {
    const [owner, repo] = repositoryFullName.split('/')

    // OAuth token stored by Tram's auth flow in Secrets Manager
    const { access_token: token } = await getSecretJson(
      `${process.env.SECRETS_PREFIX}/projects/${projectId}/oauth-token`,
    )
    const github = new GitHubClient(token)

    // Fetch files (handles pagination automatically) and full diff in parallel
    const [files, diff] = await Promise.all([
      github.getPullRequestFiles(owner, repo, prNumber),
      github.getPullRequestDiff(owner, repo, prNumber),
    ])

    await upsertChangedFiles(prId, files)
    console.log(`Stored ${files.length} changed files for PR #${prNumber}`)

    // Store the unified diff inline for now (switch to S3 for diffs > 1MB in Week 3)
    if (diff.length > 1_000_000) {
      console.warn(`Large diff (${diff.length} bytes) for PR #${prNumber} — consider S3 storage`)
    }

    await updateWebhookStatus(prId, 'analyzed')
    console.log(`PR #${prNumber} marked as analyzed`)

    return { prId, filesCount: files.length, status: 'analyzed' }
  } catch (err) {
    console.error(`PR retrieval failed for PR #${prNumber}:`, err)
    await updateWebhookStatus(prId, 'failed').catch(() => {})
    throw err
  }
}
