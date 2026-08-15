// Data access for the `users` table. Every query is parameterized — never
// interpolate values into SQL strings. Every function accepts an optional
// `db` (defaulting to the shared pool) so tests can inject a fake client
// instead of hitting a real database.

import { getPool } from '../config/db.js'

export async function findUserByGithubUserId(githubUserId, db = getPool()) {
  const result = await db.query('SELECT * FROM users WHERE github_id = $1', [githubUserId])
  return result.rows[0] ?? null
}

export async function findUserById(id, db = getPool()) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function createUser(
  { githubUserId, githubUsername, githubEmail, avatarUrl, oauthSecretReference },
  db = getPool(),
) {
  const result = await db.query(
    `INSERT INTO users (github_id, login, email, avatar_url, oauth_secret_reference)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [githubUserId, githubUsername, githubEmail ?? null, avatarUrl ?? null, oauthSecretReference],
  )
  return result.rows[0]
}

export async function updateUserProfile(
  id,
  { githubUsername, githubEmail, avatarUrl, oauthSecretReference },
  db = getPool(),
) {
  const result = await db.query(
    `UPDATE users
     SET login = $2,
         email = $3,
         avatar_url = $4,
         oauth_secret_reference = $5,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, githubUsername, githubEmail ?? null, avatarUrl ?? null, oauthSecretReference],
  )
  return result.rows[0] ?? null
}
