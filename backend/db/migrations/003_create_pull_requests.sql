-- Migration 003: pull_requests table
-- Owned by Han (PR Ingestion & Analysis)

CREATE TABLE IF NOT EXISTS pull_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  github_pr_id   BIGINT NOT NULL,
  number         INT NOT NULL,
  title          TEXT NOT NULL,
  author         TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('open', 'merged', 'closed', 'draft')),
  head_branch    TEXT NOT NULL,
  base_branch    TEXT NOT NULL,
  additions      INT NOT NULL DEFAULT 0,
  deletions      INT NOT NULL DEFAULT 0,
  commits_count  INT NOT NULL DEFAULT 0,
  webhook_status TEXT NOT NULL DEFAULT 'pending'
                   CHECK (webhook_status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL,
  updated_at     TIMESTAMPTZ NOT NULL,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, github_pr_id)
);

CREATE INDEX IF NOT EXISTS idx_pull_requests_project_id ON pull_requests (project_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status     ON pull_requests (project_id, status);
