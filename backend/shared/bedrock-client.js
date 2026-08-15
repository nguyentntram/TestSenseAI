import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { BEDROCK_CONFIG, RETRYABLE_ERROR_CODES } from './bedrock-config.js'

const client = new BedrockRuntimeClient({ region: BEDROCK_CONFIG.region })

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseBody(response) {
  return JSON.parse(Buffer.from(response.body).toString())
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Exponential backoff with jitter: delay = min(base * 2^attempt + jitter, max)
function backoffMs(attempt) {
  const { baseDelayMs, maxDelayMs } = BEDROCK_CONFIG.retry
  const exp = baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * baseDelayMs
  return Math.min(exp + jitter, maxDelayMs)
}

async function invokeWithRetry(command) {
  const { maxAttempts } = BEDROCK_CONFIG.retry
  let lastErr

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await client.send(command)
    } catch (err) {
      lastErr = err
      const code = err.name ?? err.__type ?? ''
      if (!RETRYABLE_ERROR_CODES.has(code)) throw err  // non-retryable — fail fast

      const wait = backoffMs(attempt)
      console.warn(`Bedrock ${code} on attempt ${attempt + 1}/${maxAttempts}, retrying in ${Math.round(wait)}ms`)
      await delay(wait)
    }
  }

  throw lastErr
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a 1024-dim embedding vector for the given text using Titan V2.
 * Used by Trung's memory ingestion and similarity search Lambdas.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_CONFIG.models.embedding,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text }),
  })

  const response = await invokeWithRetry(command)
  return parseBody(response).embedding
}

/**
 * Generate test code via Claude Sonnet using a system + user prompt.
 * Used by Anh's generate-tests Lambda.
 *
 * @param {{ systemPrompt: string, userPrompt: string, maxTokens?: number }} opts
 * @returns {Promise<string>} raw text from the model
 */
export async function generateTests({ systemPrompt, userPrompt, maxTokens } = {}) {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_CONFIG.models.generation,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens ?? BEDROCK_CONFIG.maxTokens.generation,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const response = await invokeWithRetry(command)
  return parseBody(response).content[0].text
}

/**
 * Single-turn chat with Claude — used by Han's chat-about-test Lambda.
 *
 * @param {{ messages: Array<{role: string, content: string}>, system?: string, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function chat({ messages, system, maxTokens } = {}) {
  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens ?? BEDROCK_CONFIG.maxTokens.generation,
    messages,
  }
  if (system) body.system = system

  const command = new InvokeModelCommand({
    modelId: BEDROCK_CONFIG.models.generation,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  })

  const response = await invokeWithRetry(command)
  return parseBody(response).content[0].text
}
