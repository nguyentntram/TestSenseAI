# Database

CockroachDB, accessed over the PostgreSQL wire protocol via the `pg`
package (`backend/src/config/db.js`) — no CockroachDB-specific client is
needed. Migrations live in `database/migrations/` as plain SQL.

## Tables

### `users`

One row per person who has signed in with GitHub at least once.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK, `gen_random_uuid()`) | Stable local user id. |
| `github_user_id` | `BIGINT`, unique | GitHub's numeric user id — stable even if the user renames their GitHub account. Used to find-or-create on sign-in. |
| `github_username` | `STRING` | Display/handle, can change over time on GitHub's side. |
| `github_email` | `STRING`, nullable | GitHub may not expose a public email. |
| `avatar_url` | `STRING`, nullable | |
| `oauth_secret_reference` | `STRING` | **Opaque pointer** into Secrets Manager (or the local dev provider) — see `docs/AUTH_FLOW.md` and the Secrets section below. The raw GitHub token is never stored in this column or anywhere else in the database. |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

Index: `idx_users_github_username` (lookups/debugging by handle).

### `projects`

One row per GitHub repository a user has connected.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` (PK, `gen_random_uuid()`) | **The stable identifier future features should reference** — see "For Han and Trung" below. |
| `user_id` | `UUID`, FK -> `users(id)` ON DELETE CASCADE | Owner. Every query in `backend/src/repositories/projectsRepository.js` filters by this column — this is the actual enforcement point for "a user may only access their own projects," not just a check in the handler layer. |
| `name` | `STRING` | User-chosen display name (defaults to the repo name). |
| `description` | `STRING`, nullable | |
| `repository_id` | `BIGINT` | GitHub's numeric repository id — stable across repository renames. |
| `repository_owner` / `repository_name` / `repository_full_name` | `STRING` | Denormalized from GitHub so the UI doesn't need a live GitHub call just to render a project card. |
| `visibility` | `STRING`, `CHECK IN ('public','private')` | |
| `language` | `STRING`, nullable | |
| `default_branch` | `STRING` | |
| `test_framework` | `STRING`, nullable | User-declared, not auto-detected yet. |
| `memory_indexing_enabled` | `BOOL` | Toggle for future memory indexing (Trung's feature) — stored now so the column exists when that work lands, not exercised yet. |
| `sync_status` | `STRING`, `CHECK IN ('pending','syncing','synced','error')` | |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | |

Constraint: `projects_user_repository_unique UNIQUE (user_id, repository_id)`
— this is what makes connecting the same GitHub repository twice
idempotent (see `backend/src/services/projectService.js`'s `createProject`,
which checks this pairing before inserting and returns the existing row
instead of erroring).

Indexes: `idx_projects_user_id` (every list/detail query),
`idx_projects_repository_full_name` (debugging/search).

## For Han (PR ingestion) and Trung (memory/retrieval)

`projects.id` (a `UUID`) is the stable foreign key both of your features
should hang off of:

```sql
-- Han's future PR table, illustrative only — not created by this change:
CREATE TABLE pull_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    ...
);

-- Trung's future memory/embedding table, illustrative only:
CREATE TABLE memory_records (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    embedding   VECTOR(...),  -- or whatever CockroachDB/pgvector setup Trung settles on
    ...
);
```

Neither table exists yet — this change deliberately does **not** create
any memory or PR-related tables, per the task's scope. `projects.id` is
guaranteed stable (never regenerated on update) and is safe to start
referencing today even before those tables exist.

## Repository layer

`backend/src/repositories/usersRepository.js` and
`.../projectsRepository.js` are the only files that write raw SQL. Every
query is parameterized (`$1, $2, ...` — never string-interpolated), and
every function takes an optional trailing `db` parameter (defaulting to the
shared pool from `config/db.js`) so tests can inject a fake client instead
of hitting a real database — see `backend/tests/projectsRepository.test.js`.

`backend/src/utils/serializers.js` converts snake_case DB rows into the
camelCase shape the frontend/API responses use, in one place.

## What was and wasn't run

**Not run:** the migrations in `database/migrations/` have not been
executed against a live CockroachDB instance — none was available in the
development environment. They were reviewed for valid CockroachDB SQL
syntax only.

**Run instead:** `backend/tests/projectsRepository.test.js` exercises the
repository layer against a fake `db.query`-shaped object, asserting the
exact SQL text and parameters passed for the ownership-scoping and
duplicate-detection queries — proving the *code path* is user-scoped and
parameterized correctly, not that CockroachDB itself filters as expected.

## Applying the migrations

```bash
psql "$DATABASE_URL" -f database/migrations/0001_create_users.sql
psql "$DATABASE_URL" -f database/migrations/0002_create_projects.sql
```

(or `cockroach sql --url "$DATABASE_URL" -f ...`)

## Connection string

CockroachDB Serverless/Cloud example:

```
postgresql://<user>:<password>@<cluster-host>:26257/<database>?sslmode=verify-full
```

Set as `DATABASE_URL` in `backend/.env` (see `backend/.env.example`). Local
CockroachDB (`cockroach start-single-node --insecure`) would instead use
`sslmode=disable` and no credentials.
