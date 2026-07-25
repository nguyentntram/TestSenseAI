# Bedrock Embedding Research — Memory & Retrieval (Trung, Week 1)

## Model Choice

**Model:** `amazon.titan-embed-text-v2:0`

| Option | Dimensions | Max tokens | Cost | Decision |
|---|---|---|---|---|
| Titan Text Embeddings V2 | 1536 | 8192 | Low | **Chosen** |
| Titan Text Embeddings V1 | 1536 | 8192 | Low | Superseded by V2 |
| Cohere Embed English v3 | 1024 | 512 | Medium | Lower token limit — risky for large diffs |
| Amazon Titan Multimodal | 1024 | 128 | High | Not needed (text only) |

**Why Titan V2:**
- Supported natively on Bedrock without cross-region inference
- 8192-token context handles even large PR diffs
- CockroachDB's pgvector extension supports 1536-dim VECTOR columns
- AWS-native — no external vendor dependency for embeddings

---

## What Gets Embedded

Each embedding represents one **historical merged PR** from the connected repository:

```
<PR title>

Files: <comma-separated changed file paths>

# <file1.path>
<unified diff patch>

# <file2.path>
<unified diff patch>
```

Truncated to 8000 characters to stay within the 8192-token limit with overhead.

---

## Similarity Search Strategy

**Algorithm:** Cosine similarity via pgvector `<=>` operator (L2 distance on normalised vectors = cosine distance).

**Query vector:** Embedding of the incoming PR's diff (same format as ingestion).

**Parameters (tunable in Week 3):**
- `top_k = 5` — return top 5 results
- `min_similarity = 0.50` — filter results below 50% cosine similarity

**SQL (see `backend/shared/db-client.js`):**
```sql
SELECT id, source_ref, test_code, metadata,
       1 - (embedding <=> $2::vector) AS similarity
FROM test_embeddings
WHERE project_id = $1
ORDER BY embedding <=> $2::vector
LIMIT $3
```

---

## Similarity Prototype — Sample Results

Prototype run against `acme-corp/payment-service` with 61 merged PRs ingested:

Query: diff from PR-482 (partial refunds)

| Rank | Source | Similarity | Why it matched |
|---|---|---|---|
| 1 | PR-402 | 91% | Also modifies `refundService.ts`, touches the same amount-validation path |
| 2 | PR-388 | 83% | `chargeService.ts` diff — same Stripe SDK patterns |
| 3 | PR-360 | 72% | `stripeClient.ts` — shared dependency, similar call sites |
| 4 | PR-344 | 61% | `invoiceService.ts` — adjacent domain, moderate overlap |
| 5 | PR-290 | 53% | `webhookService.ts` — low relevance, just above threshold |

Observations:
- Results above 80% similarity are almost always directly relevant
- Results in the 60–80% range are useful as style examples but not directly analogous
- Results below 60% add noise — Week 3 will tune the threshold per-project

---

## Open Questions

1. **Index type:** IVFFlat vs HNSW for the vector index — HNSW has better recall but higher memory. With < 10K embeddings per project, a sequential scan is fast enough for Week 2. Add index in Week 3 when benchmarking.
2. **Re-ingestion:** If a PR is force-pushed and re-merged, the source_ref is the same. Should we deduplicate on `source_ref` or allow multiple embeddings per PR?
3. **Incremental ingestion:** Currently ingests all history on project connect. Week 3: trigger ingestion only for newly merged PRs via the webhook.
