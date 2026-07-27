// Central Bedrock configuration — all model IDs and limits in one place.
// Override any value via environment variables so deployments can swap models
// without code changes (useful for staging vs. production model versions).

export const BEDROCK_CONFIG = {
  region: process.env.AWS_REGION ?? 'us-east-1',

  models: {
    // Amazon Titan Text Embeddings V2 — 1536-dim vectors, used by Trung's memory pipeline
    embedding: process.env.BEDROCK_EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0',

    // Claude Sonnet 4.6 — used by Anh's test generation Lambda
    generation: process.env.BEDROCK_GENERATION_MODEL_ID ?? 'us.anthropic.claude-sonnet-4-6-20251101-v1:0',
  },

  // Token limits per call
  maxTokens: {
    generation: Number(process.env.BEDROCK_MAX_TOKENS ?? 4096),
  },

  // Retry settings — Bedrock throttles under load; back off and retry
  retry: {
    maxAttempts: Number(process.env.BEDROCK_MAX_RETRY_ATTEMPTS ?? 3),
    baseDelayMs: Number(process.env.BEDROCK_RETRY_BASE_DELAY_MS ?? 500),
    maxDelayMs: Number(process.env.BEDROCK_RETRY_MAX_DELAY_MS ?? 10000),
  },
}

// Errors that are safe to retry (transient Bedrock failures)
export const RETRYABLE_ERROR_CODES = new Set([
  'ThrottlingException',
  'ServiceUnavailableException',
  'InternalServerException',
  'ModelTimeoutException',
])
