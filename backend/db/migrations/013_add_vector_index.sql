-- Migration 013: real distributed vector index on test_embeddings
-- Uses CockroachDB's C-SPANN vector index (v25.2+), partitioned by project_id
-- so nearest-neighbour lookups stay scoped per project instead of scanning
-- the whole table. Matches similarity-search's query shape exactly:
-- WHERE project_id = $1 ORDER BY embedding <=> $2 LIMIT $3.
--
-- vector_cosine_ops is required to accelerate the <=> (cosine) operator —
-- the default opclass only accelerates <-> (L2), which similarity-search
-- does not use.

CREATE VECTOR INDEX IF NOT EXISTS idx_test_embeddings_vector
  ON test_embeddings (project_id, embedding vector_cosine_ops);
