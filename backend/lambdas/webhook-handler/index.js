import { createHmac, timingSafeEqual } from 'crypto'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { getSecret } from '../../shared/secrets-manager.js'
import { upsertPullRequest, updateWebhookStatus } from '../../shared/db-client.js'

const lambdaClient = new LambdaClient({})
const HANDLED_ACTIONS = new Set(['opened', 'synchronize', 'reopened', 'closed'])

function verifySignature(rawBody, signature, secret) {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function deriveStatus(action, pr) {
  if (action === 'closed') return pr.merged ? 'merged' : 'closed'
  if (pr.draft) return 'draft'
  return 'open'
}

export const handler = async (event) => {
  const signature = event.headers?.['x-hub-signature-256'] ?? event.headers?.['X-Hub-Signature-256']
  const githubEvent = event.headers?.['x-github-event'] ?? event.headers?.['X-GitHub-Event']
  const rawBody = event.body ?? ''

  if (!signature || !githubEvent) {
    return res(400, { error: 'Missing x-hub-signature-256 or x-github-event header' })
  }

  const webhookSecret = await getSecret(process.env.WEBHOOK_SECRET_ARN)
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    console.warn('Webhook signature verification failed')
    return res(401, { error: 'Invalid webhook signature' })
  }

  if (githubEvent !== 'pull_request') {
    return res(200, { message: `Event '${githubEvent}' not handled` })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return res(400, { error: 'Invalid JSON' }) }

  const { action, pull_request: pr, repository } = payload
  if (!HANDLED_ACTIONS.has(action)) {
    return res(200, { message: `Action '${action}' ignored` })
  }

  const { prId, projectId } = await upsertPullRequest({
    github_pr_id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.user.login,
    status: deriveStatus(action, pr),
    head_branch: pr.head.ref,
    base_branch: pr.base.ref,
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    commits_count: pr.commits ?? 0,
    webhook_status: 'pending',
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    repository_full_name: repository.full_name,
  })

  console.log(`Upserted PR #${pr.number} → id=${prId} project=${projectId}`)

  if (action !== 'closed') {
    await updateWebhookStatus(prId, 'analyzing')
    await lambdaClient.send(new InvokeCommand({
      FunctionName: process.env.PR_RETRIEVAL_FUNCTION_NAME,
      InvocationType: 'Event',
      Payload: Buffer.from(JSON.stringify({ prId, projectId, prNumber: pr.number, repositoryFullName: repository.full_name })),
    }))
  }

  return res(200, { message: 'Webhook processed', prId, action })
}

function res(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}
