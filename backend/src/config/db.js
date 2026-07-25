import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

let pool

// Lazily creates a single shared connection pool. CockroachDB speaks the
// PostgreSQL wire protocol, so `pg` works unmodified — only the connection
// string and SSL mode differ from a plain Postgres setup (see
// docs/DATABASE.md for a CockroachDB Cloud/Serverless connection string
// example).
export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl(),
      ssl: env.isProduction()
        ? { rejectUnauthorized: env.databaseSslRejectUnauthorized() }
        : undefined,
    })
  }
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
