import { getPullRequestById, getChangedFilesByPrId, getProjectById, insertGeneratedTest, updateWebhookStatus } from '../../../shared/db-client.js'
import { generateTests } from '../../../shared/bedrock-client.js'

const SYSTEM_PROMPT = `You are a senior software engineer specializing in test automation. Your job is to generate
high-quality, targeted unit tests for code changes described in a pull request diff.

Rules you must follow:
1. Write tests that cover the NEW behaviour introduced by the diff, not existing code.
2. Focus on boundary conditions, error paths, and the exact invariants changed.
3. Use the test framework and conventions shown in the examples below.
4. Keep each test function small and focused on one behaviour.
5. Do not test implementation details. Test observable outcomes only.
6. Return your output as a JSON array. Do not include any prose outside the JSON.

Output format:
[
  {
    "title": "<filename> — <short description of what is tested>",
    "testCode": "<full test function or describe block>",
    "reasoning": "<one paragraph: why this test is important>"
  }
]`

export const handler = async (event) => {
  const { prId, similarExamples = [], memoryEntries = [] } = event

  const [pr, files] = await Promise.all([
    getPullRequestById(prId),
    getChangedFilesByPrId(prId),
  ])

  if (!pr) throw new Error(`PR ${prId} not found`)

  const project = await getProjectById(pr.project_id)
  const userPrompt = buildUserPrompt({ pr, files, project, similarExamples, memoryEntries })

  let rawOutput
  try {
    rawOutput = await generateTests({ systemPrompt: SYSTEM_PROMPT, userPrompt })
  } catch (err) {
    console.error('Bedrock generation failed:', err)
    await updateWebhookStatus(prId, 'failed')
    throw err
  }

  // Strip code fences if Claude wraps the JSON
  const jsonText = rawOutput.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let tests
  try {
    tests = JSON.parse(jsonText)
  } catch (err) {
    console.error('Failed to parse Claude output as JSON:', jsonText.slice(0, 500))
    await updateWebhookStatus(prId, 'failed')
    throw new Error('Invalid JSON from generation model')
  }

  const savedIds = []
  for (const test of tests) {
    if (!test.title || !test.testCode || !test.reasoning) continue
    const testId = await insertGeneratedTest({
      prId,
      projectId: pr.project_id,
      title: test.title,
      testCode: test.testCode,
      reasoning: test.reasoning,
      status: 'draft',
    })
    savedIds.push(testId)
  }

  console.log(`Generated ${savedIds.length} tests for PR ${prId}`)
  return { prId, generatedCount: savedIds.length, testIds: savedIds }
}

function buildUserPrompt({ pr, files, project, similarExamples, memoryEntries }) {
  const examplesText = similarExamples.length
    ? similarExamples
        .map((e, i) => `### Example ${i + 1} — ${(e.similarity * 100).toFixed(0)}% match\nSource: ${e.sourceRef}\n\`\`\`\n${e.testCode}\n\`\`\``)
        .join('\n\n')
    : 'No similar examples found.'

  const memoryText = memoryEntries.length
    ? memoryEntries.map((m) => `- [${m.type}] ${m.summary} (from ${m.source})`).join('\n')
    : 'No memory entries.'

  const filesText = files
    .map((f) => `- ${f.status} ${f.path} (+${f.additions} -${f.deletions})`)
    .join('\n')

  const patchText = files
    .filter((f) => f.patch)
    .map((f) => `# ${f.path}\n${f.patch}`)
    .join('\n\n')
    .slice(0, 60000)  // Trim to avoid token limit

  return `## Repository context
Test framework: ${project?.test_framework ?? 'unknown'}
Language: ${project?.language ?? 'unknown'}

## Historical examples (retrieved by similarity)
${examplesText}

## Repository memory
${memoryText}

## Pull request: ${pr.title}
${pr.description ? `\n${pr.description}\n` : ''}

## Changed files
${filesText}

## Diff
\`\`\`diff
${patchText}
\`\`\`

## Task
Generate 2–5 unit tests for the changes above. Return a JSON array only.`
}
