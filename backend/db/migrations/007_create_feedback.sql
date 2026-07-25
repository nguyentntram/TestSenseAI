-- Migration 007: feedback table
-- Owned by Anh (Test Generation & Feedback)

CREATE TABLE IF NOT EXISTS feedback (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_test_id UUID NOT NULL REFERENCES generated_tests(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  action            TEXT NOT NULL CHECK (action IN ('accept', 'modify', 'reject')),
  edited_code       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (generated_test_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_test_id ON feedback (generated_test_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback (user_id);
