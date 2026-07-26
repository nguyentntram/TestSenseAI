-- Migration 002: projects table
-- Owned by Tram (Projects & GitHub Connection)

CREATE TABLE IF NOT EXISTS projects (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  repository_full_name TEXT NOT NULL UNIQUE,
  default_branch       TEXT NOT NULL DEFAULT 'main',
  language             TEXT,
  test_framework       TEXT,
  sync_status          TEXT NOT NULL DEFAULT 'pending'
                         CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  last_synced_at       TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
