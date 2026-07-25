-- Projects table.
--
-- One row per GitHub repository a user has connected to TestSense AI.
-- `id` (UUID) is the stable identifier future features should reference:
--   - Han's PR ingestion/analysis tables should store `project_id UUID
--     REFERENCES projects(id)` on each PR/ingestion record.
--   - Trung's future memory/embedding tables should store the same
--     `project_id UUID REFERENCES projects(id)` on each memory record.
-- See docs/DATABASE.md for the full explanation.
--
-- `repository_id` is GitHub's numeric repository id (stable even across
-- repository renames) — used together with `user_id` for the uniqueness
-- constraint below, so the same GitHub repo can't be connected twice by the
-- same user.

CREATE TABLE IF NOT EXISTS projects (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name                     STRING NOT NULL,
    description              STRING,

    repository_id            BIGINT NOT NULL,
    repository_owner         STRING NOT NULL,
    repository_name          STRING NOT NULL,
    repository_full_name     STRING NOT NULL,
    visibility               STRING NOT NULL DEFAULT 'public'
                                 CHECK (visibility IN ('public', 'private')),
    language                 STRING,
    default_branch           STRING NOT NULL DEFAULT 'main',

    test_framework           STRING,
    memory_indexing_enabled  BOOL NOT NULL DEFAULT true,
    sync_status              STRING NOT NULL DEFAULT 'pending'
                                 CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),

    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Prevents the same user from connecting the same GitHub repository twice.
    CONSTRAINT projects_user_repository_unique UNIQUE (user_id, repository_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_repository_full_name ON projects (repository_full_name);
