import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' })

// Titan Text Embeddings V2 — 1536-dim, Trung's choice for similarity search
const EMBEDDING_MODEL_ID = 'amazon.titan-embed-text-v2:0'

// Claude claude-sonnet-4-6 — Anh's generation model
const GENERATION_MODEL_ID = 'anthropic.claude-sonnet-4-6-20251101'

export async function generateEmbedding(text) {
  const payload = { inputText: text }
  const command = new InvokeModelCommand({
    modelId: EMBEDDING_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })
  const response = await client.send(command)
  const result = JSON.parse(Buffer.from(response.body).toString())
  return result.embedding // number[]
}

export async function generateTests({ systemPrompt, userPrompt, maxTokens = 4096 }) {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  }

  const command = new InvokeModelCommand({
    modelId: GENERATION_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  })

  const response = await client.send(command)
  const result = JSON.parse(Buffer.from(response.body).toString())
  return result.content[0].text
}
