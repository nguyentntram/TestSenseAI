-- Migration 004: changed_files table
-- Owned by Han (PR Ingestion & Analysis)

CREATE TABLE IF NOT EXISTS changed_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  path            TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('added', 'modified', 'deleted', 'renamed')),
  additions       INT NOT NULL DEFAULT 0,
  deletions       INT NOT NULL DEFAULT 0,
  patch           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_changed_files_pr_id ON changed_files (pull_request_id);
