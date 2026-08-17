#!/usr/bin/env node
/**
 * End-to-end integration test for the TestSense AI pipeline.
 * Usage: TESTSENSE_BASE_URL=http://localhost:3001 node scripts/integration-test.mjs
 * Requires SESSION_COOKIE env var (obtain via the GitHub OAuth flow).
 */

const BASE_URL = process.env.TESTSENSE_BASE_URL ?? 'http://localhost:3001'
const COOKIE = process.env.SESSION_COOKIE ?? ''
const TEST_REPO = process.env.TEST_REPO ?? 'octocat/Hello-World'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    failed++
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Cookie: COOKIE,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text }
  }
}

async function run() {
  console.log(`\nTestSense AI integration test — ${BASE_URL}\n`)

  // 1. Auth
  console.log('1. Auth')
  const me = await api('/auth/me')
  assert(me.status === 200 || me.status === 401, '/auth/me responds')
  if (me.status === 401) {
    console.log('  ℹ  Not authenticated. Set SESSION_COOKIE to continue.')
    return printSummary()
  }
  assert(Boolean(me.body?.data?.id), 'current user has an id')

  // 2. Projects
  console.log('\n2. Projects')
  const list = await api('/projects')
  assert(list.status === 200, 'GET /projects returns 200')
  assert(Array.isArray(list.body?.data?.projects), 'projects is an array')

  let projectId = list.body?.data?.projects?.[0]?.id
  if (!projectId) {
    console.log(`  ℹ  No projects found — creating one for ${TEST_REPO}`)
    const created = await api('/projects', {
      method: 'POST',
      body: {
        name: 'Integration Test Project',
        repositoryFullName: TEST_REPO,
        defaultBranch: 'main',
        language: 'JavaScript',
        testFramework: 'Jest',
      },
    })
    assert(created.status === 201, 'POST /projects returns 201')
    projectId = created.body?.data?.project?.id
  }
  assert(Boolean(projectId), 'have a projectId to work with')

  // 3. Single project
  console.log('\n3. Single project')
  const project = await api(`/projects/${projectId}`)
  assert(project.status === 200, `GET /projects/${projectId} returns 200`)
  assert(project.body?.data?.project?.id === projectId, 'project id matches')

  // 4. Pull requests
  console.log('\n4. Pull requests')
  const prs = await api(`/projects/${projectId}/pull-requests`)
  assert(prs.status === 200, 'GET pull-requests returns 200')
  assert(Array.isArray(prs.body?.data?.pullRequests), 'pullRequests is an array')
  console.log(`  ℹ  ${prs.body?.data?.pullRequests?.length ?? 0} pull request(s) found`)

  // 5. Generated tests
  console.log('\n5. Generated tests')
  const tests = await api(`/projects/${projectId}/generated-tests`)
  assert(tests.status === 200 || tests.status === 404, 'generated-tests endpoint responds')
  if (tests.status === 200) {
    console.log(`  ℹ  ${tests.body?.data?.generatedTests?.length ?? 0} generated test(s) found`)
  }

  // 6. Analytics
  console.log('\n6. Analytics')
  const analytics = await api(`/projects/${projectId}/analytics`)
  assert(analytics.status === 200 || analytics.status === 404, 'analytics endpoint responds')
  if (analytics.status === 200) {
    const a = analytics.body?.data
    assert(typeof a?.memoryCount === 'number', 'analytics.memoryCount is a number')
    assert(typeof a?.retrievalHits === 'number', 'analytics.retrievalHits is a number')
    assert(typeof a?.acceptanceRate === 'number', 'analytics.acceptanceRate is a number')
    console.log(`  ℹ  memoryCount=${a?.memoryCount}, retrievalHits=${a?.retrievalHits}, acceptanceRate=${a?.acceptanceRate}`)
  }

  // 7. Project update
  console.log('\n7. Project settings update')
  const updated = await api(`/projects/${projectId}`, {
    method: 'PATCH',
    body: { name: 'Integration Test Project (updated)' },
  })
  assert(updated.status === 200, 'PATCH /projects/:id returns 200')

  printSummary()
}

function printSummary() {
  const total = passed + failed
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`${total} checks — ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => {
  console.error('Integration test crashed:', err)
  process.exit(1)
})
