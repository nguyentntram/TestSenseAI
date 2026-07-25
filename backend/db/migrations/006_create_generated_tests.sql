-- Migration 006: generated_tests table
-- Owned by Anh (Test Generation & Feedback)

CREATE TABLE IF NOT EXISTS generated_tests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  test_code       TEXT NOT NULL,
  reasoning       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'ready', 'rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_tests_pr_id      ON generated_tests (pull_request_id);
CREATE INDEX IF NOT EXISTS idx_generated_tests_project_id ON generated_tests (project_id);
CREATE INDEX IF NOT EXISTS idx_generated_tests_status     ON generated_tests (project_id, status);
