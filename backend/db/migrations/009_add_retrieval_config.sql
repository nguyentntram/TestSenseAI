-- Per-project retrieval tuning: operators can adjust top-k and similarity
-- threshold per project without redeploying code.
-- Defaults match the Week 2 hardcoded values.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS retrieval_top_k          INTEGER      NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS retrieval_min_similarity NUMERIC(4,3) NOT NULL DEFAULT 0.500;
