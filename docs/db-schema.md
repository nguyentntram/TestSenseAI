# CockroachDB Schema — All Tables

Run migrations in order: 001 → 007. Each file is in `backend/db/migrations/`.

---

## 001 · `users` (Tram)

```sql
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id  BIGINT NOT NULL UNIQUE,
  login      TEXT NOT NULL,
  email      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 002 · `projects` (Tram)

```sql
CREATE TABLE projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  repository_full_name TEXT NOT NULL UNIQUE,
  default_branch       TEXT NOT NULL DEFAULT 'main',
  language             TEXT,
  test_framework       TEXT,
  sync_status          TEXT NOT NULL DEFAULT 'pending'
                         CHECK (sync_status IN ('pending','syncing','synced','error')),
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user_id ON projects (user_id);
```

---

## 003 · `pull_requests` (Han)

```sql
CREATE TABLE pull_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  github_pr_id   BIGINT NOT NULL,
  number         INT NOT NULL,
  title          TEXT NOT NULL,
  author         TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('open','merged','closed','draft')),
  head_branch    TEXT NOT NULL,
  base_branch    TEXT NOT NULL,
  additions      INT NOT NULL DEFAULT 0,
  deletions      INT NOT NULL DEFAULT 0,
  commits_count  INT NOT NULL DEFAULT 0,
  webhook_status TEXT NOT NULL DEFAULT 'pending'
                   CHECK (webhook_status IN ('pending','analyzing','analyzed','failed')),
  created_at     TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, github_pr_id)
);

CREATE INDEX idx_pull_requests_project_id ON pull_requests (project_id);
CREATE INDEX idx_pull_requests_status     ON pull_requests (project_id, status);
```

---

## 004 · `changed_files` (Han)

```sql
CREATE TABLE changed_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('added','modified','deleted','renamed')),
  additions       INT NOT NULL DEFAULT 0,
  deletions       INT NOT NULL DEFAULT 0,
  patch           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_changed_files_pr_id ON changed_files (pull_request_id);
```

---

## 005 · `test_embeddings` (Trung)

Requires the `pgvector` extension (available on CockroachDB Cloud).

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE test_embeddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_ref TEXT NOT NULL,        -- e.g. "PR-402"
  test_code  TEXT NOT NULL,        -- embedded text (diff + file paths)
  embedding  VECTOR(1536) NOT NULL, -- Titan Text Embeddings V2
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_embeddings_project ON test_embeddings (project_id);
-- Add IVFFlat/HNSW vector index after bulk ingestion (Week 3)
```

**Similarity query (cosine distance via pgvector):**
```sql
SELECT id, source_ref, test_code, metadata,
       1 - (embedding <=> $2::vector) AS similarity
FROM test_embeddings
WHERE project_id = $1
ORDER BY embedding <=> $2::vector
LIMIT $3;
```

---

## 006 · `generated_tests` (Anh)

```sql
CREATE TABLE generated_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  test_code       TEXT NOT NULL,
  reasoning       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','ready','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_generated_tests_pr_id      ON generated_tests (pull_request_id);
CREATE INDEX idx_generated_tests_project_id ON generated_tests (project_id);
CREATE INDEX idx_generated_tests_status     ON generated_tests (project_id, status);
```

---

## 007 · `feedback` (Anh)

```sql
CREATE TABLE feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_test_id UUID NOT NULL REFERENCES generated_tests(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  action            TEXT NOT NULL CHECK (action IN ('accept','modify','reject')),
  edited_code       TEXT,          -- only set when action = 'modify'
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (generated_test_id, user_id)
);

CREATE INDEX idx_feedback_test_id ON feedback (generated_test_id);
CREATE INDEX idx_feedback_user_id ON feedback (user_id);
```

---

## Entity Relationship Summary

```
users
  └── projects (user_id)
        ├── pull_requests (project_id)
        │     ├── changed_files (pull_request_id)
        │     └── generated_tests (pull_request_id, project_id)
        │           └── feedback (generated_test_id, user_id)
        └── test_embeddings (project_id)
```
