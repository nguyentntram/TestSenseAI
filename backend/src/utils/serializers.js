// Converts snake_case database rows into the camelCase JSON shape the
// frontend consumes. Keeping this in one place means the API response shape
// can change without touching repository or handler code.

export function toUserDto(row) {
  return {
    id: row.id,
    githubUsername: row.login,
    githubEmail: row.email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  }
}

export function toPullRequestDto(row) {
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    author: row.author,
    status: row.status,
    headBranch: row.head_branch,
    baseBranch: row.base_branch,
    additions: row.additions ?? 0,
    deletions: row.deletions ?? 0,
    commitsCount: row.commits_count ?? 0,
    webhookStatus: row.webhook_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toGeneratedTestDto(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    reasoning: row.reasoning,
    testCode: row.test_code,
    linkedPrId: row.pull_request_id,
    linkedPr: `PR-${row.pr_number}`,
    generatedAt: row.created_at,
  }
}

export function toMemoryEntryDto(row) {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    type: 'pr',
    summary: meta.prTitle ?? row.source_ref,
    source: row.source_ref,
    indexedAt: row.created_at,
  }
}

export function toProjectDto(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    repositoryId: row.repository_id,
    repositoryOwner: row.repository_owner,
    repositoryName: row.repository_name,
    repositoryFullName: row.repository_full_name,
    visibility: row.visibility,
    language: row.language,
    defaultBranch: row.default_branch,
    testFramework: row.test_framework,
    memoryIndexingEnabled: row.memory_indexing_enabled,
    syncStatus: row.sync_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
