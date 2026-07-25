// Data access for the `projects` table. Every query is scoped by `user_id`
// so one user can never read, modify, or delete another user's project —
// this is the enforcement point for the "a user may access only their own
// projects" requirement, not just something checked in the handler layer.

import { getPool } from '../config/db.js'

export async function listProjectsForUser(userId, db = getPool()) {
  const result = await db.query(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  )
  return result.rows
}

export async function findProjectByIdForUser(id, userId, db = getPool()) {
  const result = await db.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
    id,
    userId,
  ])
  return result.rows[0] ?? null
}

export async function findProjectByRepositoryForUser(userId, repositoryId, db = getPool()) {
  const result = await db.query(
    'SELECT * FROM projects WHERE user_id = $1 AND repository_id = $2',
    [userId, repositoryId],
  )
  return result.rows[0] ?? null
}

export async function createProjectRecord(
  {
    userId,
    name,
    description,
    repositoryId,
    repositoryOwner,
    repositoryName,
    repositoryFullName,
    visibility,
    language,
    defaultBranch,
    testFramework,
  },
  db = getPool(),
) {
  const result = await db.query(
    `INSERT INTO projects (
       user_id, name, description, repository_id, repository_owner,
       repository_name, repository_full_name, visibility, language,
       default_branch, test_framework
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      name,
      description ?? null,
      repositoryId,
      repositoryOwner,
      repositoryName,
      repositoryFullName,
      visibility,
      language ?? null,
      defaultBranch,
      testFramework ?? null,
    ],
  )
  return result.rows[0]
}

export async function updateProjectRecord(id, userId, fields, db = getPool()) {
  const allowedColumns = {
    name: 'name',
    description: 'description',
    defaultBranch: 'default_branch',
    testFramework: 'test_framework',
    memoryIndexingEnabled: 'memory_indexing_enabled',
    syncStatus: 'sync_status',
  }

  const setClauses = []
  const values = [id, userId]

  for (const [key, column] of Object.entries(allowedColumns)) {
    if (fields[key] !== undefined) {
      values.push(fields[key])
      setClauses.push(`${column} = $${values.length}`)
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — return the current row unchanged.
    return findProjectByIdForUser(id, userId, db)
  }

  const result = await db.query(
    `UPDATE projects
     SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    values,
  )
  return result.rows[0] ?? null
}

export async function deleteProjectRecord(id, userId, db = getPool()) {
  const result = await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id', [
    id,
    userId,
  ])
  return result.rows.length > 0
}
