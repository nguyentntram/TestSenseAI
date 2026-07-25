-- Migration 005: test_embeddings table
-- Owned by Trung (Memory & Retrieval)
-- Requires the pgvector extension (available on CockroachDB Cloud).

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS test_embeddings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_ref TEXT NOT NULL,
  test_code  TEXT NOT NULL,
  embedding  VECTOR(1536) NOT NULL,  -- Titan Text Embeddings V2 dimension
  metadata   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IVFFlat index for approximate nearest-neighbour search (cosine distance)
-- Build after bulk ingestion, not before — empty-table index offers no benefit.
CREATE INDEX IF NOT EXISTS idx_test_embeddings_project ON test_embeddings (project_id);
