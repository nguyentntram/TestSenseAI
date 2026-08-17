-- Migration 012: similarity_search_logs table
-- Owned by Trung (Memory & Retrieval) — backs the retrievalHits / avgSimilarity
-- analytics fields called for in issue #17.

CREATE TABLE IF NOT EXISTS similarity_search_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pull_request_id UUID REFERENCES pull_requests(id) ON DELETE SET NULL,
  top_k           INTEGER NOT NULL,
  min_similarity  NUMERIC(4,3) NOT NULL,
  raw_count       INTEGER NOT NULL,
  filtered_count  INTEGER NOT NULL,
  top_similarity  NUMERIC(5,4),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_similarity_search_logs_project ON similarity_search_logs (project_id);
