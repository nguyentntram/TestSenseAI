import './helpers/testEnv.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  findProjectByIdForUser,
  findProjectByRepositoryForUser,
  updateProjectRecord,
  deleteProjectRecord,
} from '../src/repositories/projectsRepository.js'

// These exercise the SQL/parameter *contract* against a fake `pg`-shaped
// client (no real CockroachDB was available in this environment) — they
// prove every query is user-scoped and parameterized, not that Postgres
// itself filters correctly. See docs/DATABASE.md for the "not run against
// a live database" note.
function fakeDb(rows) {
  const calls = []
  return {
    calls,
    async query(text, params) {
      calls.push({ text, params })
      return { rows }
    },
  }
}

test('findProjectByIdForUser scopes the query by both id and user_id', async () => {
  const db = fakeDb([{ id: 'p1', user_id: 'u1' }])
  const result = await findProjectByIdForUser('p1', 'u1', db)

  assert.equal(db.calls.length, 1)
  assert.match(db.calls[0].text, /WHERE id = \$1 AND user_id = \$2/)
  assert.deepEqual(db.calls[0].params, ['p1', 'u1'])
  assert.equal(result.id, 'p1')
})

test('findProjectByIdForUser returns null when the fake DB has no matching row', async () => {
  // Simulates "belongs to a different user" and "doesn't exist" the same
  // way the real WHERE clause would: no row comes back either way.
  const db = fakeDb([])
  const result = await findProjectByIdForUser('p1', 'someone-elses-user-id', db)
  assert.equal(result, null)
})

test('findProjectByRepositoryForUser scopes by user_id and repository_id (duplicate-connection check)', async () => {
  const db = fakeDb([{ id: 'p1', repository_id: 999 }])
  await findProjectByRepositoryForUser('u1', 999, db)
  assert.match(db.calls[0].text, /WHERE user_id = \$1 AND repository_id = \$2/)
  assert.deepEqual(db.calls[0].params, ['u1', 999])
})

test('updateProjectRecord only sets provided fields and stays user-scoped', async () => {
  const db = fakeDb([{ id: 'p1', name: 'New name' }])
  await updateProjectRecord('p1', 'u1', { name: 'New name' }, db)

  const [{ text, params }] = db.calls
  assert.match(text, /SET name = \$3/)
  assert.match(text, /WHERE id = \$1 AND user_id = \$2/)
  assert.deepEqual(params, ['p1', 'u1', 'New name'])
})

test('updateProjectRecord with no fields short-circuits to a plain lookup', async () => {
  const db = fakeDb([{ id: 'p1' }])
  await updateProjectRecord('p1', 'u1', {}, db)
  assert.match(db.calls[0].text, /SELECT \* FROM projects WHERE id = \$1 AND user_id = \$2/)
})

test('deleteProjectRecord scopes the delete by user_id and reports success/failure', async () => {
  const dbWithMatch = fakeDb([{ id: 'p1' }])
  assert.equal(await deleteProjectRecord('p1', 'u1', dbWithMatch), true)
  assert.match(dbWithMatch.calls[0].text, /DELETE FROM projects WHERE id = \$1 AND user_id = \$2/)

  const dbNoMatch = fakeDb([])
  assert.equal(await deleteProjectRecord('p1', 'someone-elses-user-id', dbNoMatch), false)
})
