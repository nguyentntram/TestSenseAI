-- Migration 010: extend users/projects with columns the OAuth + project-CRUD
-- backend (backend/src/*) requires but 001/002 never created.

ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_secret_reference TEXT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repository_id BIGINT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repository_owner TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS repository_name TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS memory_indexing_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_projects_user_repository_id ON projects (user_id, repository_id);
