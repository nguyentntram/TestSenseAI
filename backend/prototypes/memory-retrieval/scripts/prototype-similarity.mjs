// Prototype: embed a sample "PR description" query and a small corpus of
// past bug fixes / test patterns / conventions using Amazon Bedrock, then
// rank the corpus by cosine similarity to the query.
//
// No database involved — this only proves out the embedding model choice
// and the similarity math before the real ingestion/search endpoints
// (backend/src/handlers/*) get wired up next week.
//
// Usage:
//   cd backend/prototypes/memory-retrieval
//   npm install
//   npm run prototype:similarity
//   npm run prototype:similarity -- "your own query text here"

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

const MODEL_ID = process.env.BEDROCK_EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0'
const REGION = process.env.AWS_REGION ?? 'us-east-1'
const EMBEDDING_DIMENSIONS = 1024

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DEFAULT_QUERY =
  'Adding the ability to issue a partial refund on a charge, need to validate the requested amount is positive and does not exceed the original charge.'

const client = new BedrockRuntimeClient({ region: REGION })

async function embed(text) {
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text,
      dimensions: EMBEDDING_DIMENSIONS,
      normalize: true,
    }),
  })
  const response = await client.send(command)
  const payload = JSON.parse(new TextDecoder().decode(response.body))
  return payload.embedding
}

function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

async function main() {
  const query = process.argv[2] ?? DEFAULT_QUERY
  const historyPath = path.join(__dirname, '..', 'data', 'sample-history.json')
  const history = JSON.parse(await readFile(historyPath, 'utf-8'))

  console.log(`Model: ${MODEL_ID} (${EMBEDDING_DIMENSIONS} dims)`)
  console.log(`Query: "${query}"\n`)

  const queryEmbedding = await embed(query)

  const scored = []
  for (const entry of history) {
    const embedding = await embed(entry.text)
    scored.push({ ...entry, score: cosineSimilarity(queryEmbedding, embedding) })
  }

  scored.sort((a, b) => b.score - a.score)

  console.log('Ranked by similarity:')
  for (const entry of scored) {
    console.log(`  ${entry.score.toFixed(4)}  [${entry.type}]  ${entry.id} — ${entry.title}`)
  }
}

main().catch((err) => {
  console.error('Prototype failed:', err.name, '-', err.message)
  console.error('HTTP status:', err.$metadata?.httpStatusCode)
  if (err.Cause) console.error('Cause:', err.Cause)
  if (
    err.name === 'UnrecognizedClientException' ||
    err.name === 'CredentialsProviderError' ||
    /credentials/i.test(err.message)
  ) {
    console.error(
      'No AWS credentials found. In backend/prototypes/memory-retrieval/.env, set either AWS_BEARER_TOKEN_BEDROCK (Bedrock console -> API keys) or configure IAM credentials via `aws configure`/AWS_PROFILE. See backend/prototypes/memory-retrieval/README.md section 2.',
    )
  }
  process.exitCode = 1
})
