// Converts snake_case database rows into the camelCase JSON shape the
// frontend consumes. Keeping this in one place means the API response shape
// can change without touching repository or handler code.

export function toUserDto(row) {
  return {
    id: row.id,
    githubUsername: row.github_username,
    githubEmail: row.github_email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
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
