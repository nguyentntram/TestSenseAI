-- Migration 011: correct test_embeddings.embedding dimension
-- amazon.titan-embed-text-v2:0 returns 1024-dim vectors by default, not 1536
-- (1536 was Titan Text Embeddings V1's fixed dimension). Table is empty —
-- no data migration needed, just the type correction.

ALTER TABLE test_embeddings ALTER COLUMN embedding TYPE VECTOR(1024);
