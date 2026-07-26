import pg from 'pg'

const { Pool } = pg

let pool = null

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // CockroachDB Cloud requires SSL
      max: 5,                             // Lambda concurrency is low — keep pool small
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    })
    pool.on('error', (err) => console.error('Unexpected DB pool error', err))
  }
  return pool
}

export async function query(sql, params = []) {
  const result = await getPool().query(sql, params)
  return result
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject({ name, repositoryFullName, defaultBranch, language, testFramework, userId }) {
  const { rows } = await query(
    `INSERT INTO projects (name, repository_full_name, default_branch, language, test_framework, user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, repositoryFullName, defaultBranch, language, testFramework, userId],
  )
  return rows[0].id
}

export async function getProjectsByUserId(userId) {
  const { rows } = await query(
    `SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return rows
}

export async function getProjectById(projectId) {
  const { rows } = await query(`SELECT * FROM projects WHERE id = $1`, [projectId])
  return rows[0] ?? null
}

export async function getProjectByRepoFullName(repoFullName) {
  const { rows } = await query(
    `SELECT * FROM projects WHERE repository_full_name = $1`,
    [repoFullName],
  )
  return rows[0] ?? null
}

export async function deleteProject(projectId, userId) {
  await query(`DELETE FROM projects WHERE id = $1 AND user_id = $2`, [projectId, userId])
}

export async function updateProjectSyncStatus(projectId, syncStatus) {
  await query(
    `UPDATE projects SET sync_status = $1, last_synced_at = NOW() WHERE id = $2`,
    [syncStatus, projectId],
  )
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser({ githubId, login, email, avatarUrl }) {
  const { rows } = await query(
    `INSERT INTO users (github_id, login, email, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (github_id) DO UPDATE SET login = EXCLUDED.login, email = EXCLUDED.email, avatar_url = EXCLUDED.avatar_url, updated_at = NOW()
     RETURNING id`,
    [githubId, login, email, avatarUrl],
  )
  return rows[0].id
}

export async function getUserById(userId) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [userId])
  return rows[0] ?? null
}

// ─── Pull Requests ────────────────────────────────────────────────────────────

export async function upsertPullRequest(pr) {
  const project = await getProjectByRepoFullName(pr.repository_full_name)
  if (!project) throw new Error(`No project found for repo ${pr.repository_full_name}`)

  const { rows } = await query(
    `INSERT INTO pull_requests
       (project_id, github_pr_id, number, title, author, status,
        head_branch, base_branch, additions, deletions, commits_count,
        webhook_status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (project_id, github_pr_id) DO UPDATE SET
       title = EXCLUDED.title,
       status = EXCLUDED.status,
       additions = EXCLUDED.additions,
       deletions = EXCLUDED.deletions,
       commits_count = EXCLUDED.commits_count,
       webhook_status = EXCLUDED.webhook_status,
       updated_at = EXCLUDED.updated_at,
       synced_at = NOW()
     RETURNING id`,
    [
      project.id,
      pr.github_pr_id,
      pr.number,
      pr.title,
      pr.author,
      pr.status,
      pr.head_branch,
      pr.base_branch,
      pr.additions,
      pr.deletions,
      pr.commits_count,
      pr.webhook_status,
      pr.created_at,
      pr.updated_at,
    ],
  )
  return { prId: rows[0].id, projectId: project.id }
}

export async function getPullRequestById(prId) {
  const { rows } = await query(`SELECT * FROM pull_requests WHERE id = $1`, [prId])
  return rows[0] ?? null
}

export async function getPullRequestsByProjectId(projectId) {
  const { rows } = await query(
    `SELECT * FROM pull_requests WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId],
  )
  return rows
}

export async function updateWebhookStatus(prId, webhookStatus) {
  await query(
    `UPDATE pull_requests SET webhook_status = $1, synced_at = NOW() WHERE id = $2`,
    [webhookStatus, prId],
  )
}

export async function storePrDiff(prId, diff) {
  await query(`UPDATE pull_requests SET diff_text = $1 WHERE id = $2`, [diff, prId])
}

// ─── Changed Files ────────────────────────────────────────────────────────────

export async function upsertChangedFiles(prId, files) {
  // Delete existing rows for this PR, then bulk insert fresh data
  await query(`DELETE FROM changed_files WHERE pull_request_id = $1`, [prId])

  for (const file of files) {
    await query(
      `INSERT INTO changed_files (pull_request_id, path, status, additions, deletions, patch)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [prId, file.filename, file.status, file.additions, file.deletions, file.patch ?? null],
    )
  }
}

export async function getChangedFilesByPrId(prId) {
  const { rows } = await query(
    `SELECT * FROM changed_files WHERE pull_request_id = $1 ORDER BY path`,
    [prId],
  )
  return rows
}

// ─── Test Embeddings (Trung) ──────────────────────────────────────────────────

export async function insertTestEmbedding({ projectId, sourceRef, testCode, embedding, metadata }) {
  const { rows } = await query(
    `INSERT INTO test_embeddings (project_id, source_ref, test_code, embedding, metadata)
     VALUES ($1,$2,$3,$4::vector,$5)
     RETURNING id`,
    [projectId, sourceRef, testCode, JSON.stringify(embedding), JSON.stringify(metadata)],
  )
  return rows[0].id
}

export async function searchSimilarEmbeddings(projectId, queryEmbedding, topK = 5) {
  const { rows } = await query(
    `SELECT id, source_ref, test_code, metadata,
            1 - (embedding <=> $2::vector) AS similarity
     FROM test_embeddings
     WHERE project_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [projectId, JSON.stringify(queryEmbedding), topK],
  )
  return rows
}

// ─── Retrieval Config (Trung) ─────────────────────────────────────────────────

export async function getRetrievalConfig(projectId) {
  const { rows } = await query(
    `SELECT retrieval_top_k, retrieval_min_similarity FROM projects WHERE id = $1`,
    [projectId],
  )
  if (!rows[0]) return { topK: 5, minSimilarity: 0.5 }
  return {
    topK: rows[0].retrieval_top_k ?? 5,
    minSimilarity: parseFloat(rows[0].retrieval_min_similarity ?? '0.5'),
  }
}

export async function getIndexedSourceRefs(projectId) {
  const { rows } = await query(
    `SELECT source_ref FROM test_embeddings WHERE project_id = $1`,
    [projectId],
  )
  return new Set(rows.map(r => r.source_ref))
}

// ─── Generated Tests (Anh) ──────────────────────��─────────────────────────────

export async function insertGeneratedTest({ prId, projectId, title, testCode, reasoning, status }) {
  const { rows } = await query(
    `INSERT INTO generated_tests (pull_request_id, project_id, title, test_code, reasoning, status)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [prId, projectId, title, testCode, reasoning, status ?? 'draft'],
  )
  return rows[0].id
}

export async function getGeneratedTestsByPrId(prId) {
  const { rows } = await query(
    `SELECT * FROM generated_tests WHERE pull_request_id = $1 ORDER BY created_at`,
    [prId],
  )
  return rows
}

// ─── Feedback (Anh) ───────────────────────────────────────────────────────────

export async function saveFeedback({ testId, userId, action, editedCode }) {
  const { rows } = await query(
    `INSERT INTO feedback (generated_test_id, user_id, action, edited_code)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (generated_test_id, user_id) DO UPDATE SET action = EXCLUDED.action, edited_code = EXCLUDED.edited_code, updated_at = NOW()
     RETURNING id`,
    [testId, userId, action, editedCode ?? null],
  )

  // Update the test's status to match the accepted/rejected action
  if (action === 'accept') {
    await query(`UPDATE generated_tests SET status = 'ready' WHERE id = $1`, [testId])
  } else if (action === 'reject') {
    await query(`UPDATE generated_tests SET status = 'rejected' WHERE id = $1`, [testId])
  }

  return rows[0].id
}
