# Memory & Retrieval Prototype

This folder holds an early backend prototype for TestSense AI's memory/
retrieval feature. It is intentionally **not** wired into the frontend
app and has no shared dependencies with the real `backend/` app one
level up (its own `package.json`/`package-lock.json` are self-contained)
— it exists to de-risk two decisions before real ingestion/search
endpoints are built:

1. Which Bedrock embedding model to use.
2. Whether a simple cosine-similarity query against sample data returns
   sensible rankings.

Nothing here talks to CockroachDB or a real API Gateway/Lambda yet — see
"What's not in scope yet" below.

## 1. Embedding Model Choice

**Chosen model: `amazon.titan-embed-text-v2:0` (Amazon Titan Text Embeddings V2), 1024 dimensions.**

Why this model over alternatives on Bedrock:

- **Cohere Embed (English/Multilingual)** — good quality, but Titan V2 is
  priced lower per token and we don't currently need multilingual support
  (all target repos are English-language code/PRs).
- **Titan Embeddings V1 (`amazon.titan-embed-text-v1`)** — superseded by V2;
  V2 supports configurable output dimensions (256 / 512 / 1024) and
  normalization, and benchmarks better on retrieval tasks.
- **Titan V2 at 1024 dims** (vs. 256/512) — chosen for retrieval quality;
  storage cost of a few thousand vectors at 1024 floats is negligible, and
  we can always re-embed at a smaller dimension later if CockroachDB vector
  index performance becomes a concern.

This is a Week 1 prototype-stage decision — revisit if next week's real
ingestion volume/cost numbers suggest otherwise.

## 2. Prerequisites

- Node.js 20+ (same requirement as the frontend; `--env-file-if-exists`
  used below needs Node 20.12+/22+ — this repo is verified against 24).
- An AWS account with **model access requested and granted** for
  `amazon.titan-embed-text-v2:0` in your target region:
  1. AWS Console → Amazon Bedrock → **Model access** (left sidebar).
  2. Click **Modify model access** (or **Manage model access**).
  3. Check **Titan Text Embeddings V2**, submit, and wait for status to
     show **Access granted** (usually near-instant for Titan models).
- Authentication — pick **one**:
  - **Bedrock API key (simplest)**: Bedrock console → **API keys** →
    **Generate long-term API key**. Copy the value into
    `AWS_BEARER_TOKEN_BEDROCK` in `.env`. The SDK detects this env var
    automatically and authenticates with it — no `aws configure` needed.
  - **IAM credentials**: `aws configure` (writes to `~/.aws/credentials`),
    or an existing named profile exported via `AWS_PROFILE=your-profile`.
    The IAM principal needs `bedrock:InvokeModel` on the Titan embedding
    model resource, at minimum. Leave `AWS_BEARER_TOKEN_BEDROCK` unset in
    `.env` if you use this path.

## 3. Setup Steps

```bash
cd backend/prototypes/memory-retrieval
npm install
cp .env.example .env
```

Edit `.env`: set `AWS_REGION` if not `us-east-1`, and either
`AWS_BEARER_TOKEN_BEDROCK` (API key path) or leave it blank if you're using
`aws configure`/`AWS_PROFILE` instead. `npm run prototype:similarity` loads
`.env` automatically (via Node's `--env-file-if-exists`) — no extra
`export`s needed.

## 4. Running the Similarity Prototype

```bash
npm run prototype:similarity
```

This will:

1. Embed a sample PR description (a partial-refund feature, hardcoded as
   the default query) using the chosen Bedrock model.
2. Embed each entry in `data/sample-history.json` (a handful of past bug
   fixes, test patterns, and conventions).
3. Rank the history entries by cosine similarity to the query and print the
   ranked list with scores.

Pass your own query text as an argument to try a different PR description:

```bash
npm run prototype:similarity -- "Adding a retry queue for failed webhook deliveries"
```

Expected output shape:

```
Model: amazon.titan-embed-text-v2:0 (1024 dims)
Query: "Adding the ability to issue a partial refund on a charge..."

Ranked by similarity:
  0.8421  [bug-fix]       PR-402 — Refund amounts could go negative when discounts were applied twice
  0.7913  [test-pattern]  test/helpers/fakeStripeClient.ts — Payment provider calls are mocked with...
  0.7605  [convention]    CONTRIBUTING.md — All monetary values are stored as integer cents, never floats
  ...
```

If it fails with `UnrecognizedClientException` or a credentials error,
double-check `aws configure`/`AWS_PROFILE` and that model access was
actually granted (not just requested) in the Bedrock console for the
region in `.env`. As of 2026-07-20, this hasn't been confirmed to run
successfully end-to-end yet — see the "known blocker" note in project
memory if you're picking this back up: Bedrock InvokeModel returned
`ValidationException: Operation not allowed` on a brand-new AWS account
with no verified payment method, independent of auth method or region.
Check whether billing verification has since completed before re-debugging
IAM/region.

## 5. What's Not in Scope Yet (Next Week)

- A real ingestion endpoint (pull historical tests from a connected repo,
  embed via Bedrock, store vectors in CockroachDB) and a real
  similarity-search API do not exist yet — this prototype only proves out
  the model choice and cosine-similarity math in isolation.
- No database is read or written by this prototype — `data/sample-history.json`
  is static, hand-written sample data, not indexed repository history.
- The frontend's `SimilarExamplesPanel` (`../src/components/prs/`) still
  reads local mock data (`../src/data/similarExamples.js`), not this
  prototype's output — connecting the two is next week's work.
