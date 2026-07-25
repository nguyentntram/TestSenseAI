# Bedrock Prompt Design — Test Generation (Anh, Week 1)

## Model Choice

**Model:** `anthropic.claude-sonnet-4-6-20251101` via Amazon Bedrock

Reasons:
- Strong code understanding across TypeScript, Python, and Go (the team's three languages)
- Reliable structured output when asked to return JSON
- Cost/quality balance is better than Opus for this use case (generation is called per PR, not per request)

---

## Input Data Available at Generation Time

When Anh's Lambda is invoked by Step Functions, it receives:

| Input | Source | Used for |
|---|---|---|
| PR diff (unified) | Han's `pr-retrieval` Lambda | Understand what changed |
| Changed files list | Han's DB (`changed_files`) | Know which files to target |
| Similar historical examples | Trung's `similarity-search` endpoint | Provide concrete examples to Claude |
| Repository memory entries | Trung's DB (`test_embeddings`) | Apply project conventions |
| Test framework | Tram's DB (`projects.test_framework`) | Generate idiomatic tests |

---

## System Prompt

```
You are a senior software engineer specializing in test automation. Your job is to generate
high-quality, targeted unit tests for code changes described in a pull request diff.

Rules you must follow:
1. Write tests that cover the NEW behaviour introduced by the diff, not existing code.
2. Focus on boundary conditions, error paths, and the exact invariants changed.
3. Use the test framework and conventions shown in the examples below. Never introduce
   new dependencies or test utilities not already present in the examples.
4. Keep each test function small and focused on one behaviour.
5. Do not test implementation details (private functions, internal state). Test observable
   outcomes only.
6. Return your output as a JSON array. Do not include any prose outside the JSON.

Output format — array of test objects:
[
  {
    "title": "<filename> — <short description of what is tested>",
    "testCode": "<full test function or describe block as a string>",
    "reasoning": "<one paragraph: why this test is important, what invariant it protects>"
  }
]
```

---

## User Prompt Template

```
## Repository context
Test framework: {{testFramework}}
Language: {{language}}

## Historical examples (retrieved by similarity — use these as style and convention guides)
{{#each similarExamples}}
### Example {{@index}} — similarity {{similarity}}%
Source: {{sourceRef}}
```
{{testCode}}
```
{{/each}}

## Repository memory (coding conventions)
{{#each memoryEntries}}
- [{{type}}] {{summary}} (from {{source}})
{{/each}}

## Pull request diff
```diff
{{prDiff}}
```

## Changed files
{{#each changedFiles}}
- {{status}} {{path}} (+{{additions}} -{{deletions}})
{{/each}}

## Task
Generate unit tests for the changes shown in the diff above.
Return a JSON array following the output format in the system prompt.
Generate between 2 and 5 tests. Prioritize the highest-risk new behaviour.
```

---

## Prompt Iteration Notes

**v1 (Week 1 prototype):** Initial prompt. Tested manually on the `payment-service` partial refund diff.

Observations from the prototype run:
- Claude correctly identified the `amount <= 0` and `amount > charge.amount` boundary conditions
- Claude inferred the `fakeStripeClient` mock helper from the repository memory entry without being told explicitly
- Without the "do not test implementation details" rule, Claude generated a test that checked internal state — added that rule in v1

**Known gaps to address in Week 2:**
1. Large diffs (>500 lines) cause the prompt to exceed 100K tokens — need a diff truncation strategy
2. The JSON output is occasionally wrapped in a code fence — add a post-processing strip step
3. Go tests should use `t.Run` subtests — add a language-specific convention rule

---

## Post-processing

Claude's output is parsed as JSON and each object is validated against this schema before writing to DB:

```js
{
  title: string,          // non-empty
  testCode: string,       // non-empty, must contain at least one test assertion keyword
  reasoning: string,      // non-empty
}
```

Validation rejects objects where `testCode` does not contain any of: `expect`, `assert`, `t.Error`, `t.Fatal`, `should`.
