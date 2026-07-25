# Database

SQL migrations for TestSense AI's CockroachDB schema.

- `migrations/0001_create_users.sql`
- `migrations/0002_create_projects.sql`

Run them in order against your CockroachDB instance, e.g.:

```bash
psql "$DATABASE_URL" -f database/migrations/0001_create_users.sql
psql "$DATABASE_URL" -f database/migrations/0002_create_projects.sql
```

(`cockroach sql --url "$DATABASE_URL" -f ...` works the same way if you're
using the CockroachDB CLI instead of `psql`.)

For full schema documentation — field meanings, relationships, and how
future features (PR ingestion, memory/embeddings) should reference these
tables — see [`docs/DATABASE.md`](../docs/DATABASE.md).

These migrations have **not** been executed against a live database as part
of this change — no CockroachDB instance was available in the development
environment. They have been reviewed for valid CockroachDB SQL syntax only.
