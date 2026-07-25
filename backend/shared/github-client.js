const GITHUB_API = 'https://api.github.com'
const RATE_LIMIT_WARN_THRESHOLD = 100

export class GitHubClient {
  constructor(token) {
    this.token = token
    this.headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TestSenseAI/1.0',
    }
  }

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${GITHUB_API}${path}`
    const res = await fetch(url, { ...options, headers: { ...this.headers, ...options.headers } })

    const remaining = Number(res.headers.get('x-ratelimit-remaining') ?? 999)
    if (remaining < RATE_LIMIT_WARN_THRESHOLD) {
      console.warn(`GitHub rate limit low: ${remaining} requests remaining`)
    }

    if (res.status === 403 && remaining === 0) {
      const resetAt = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000
      const waitMs = Math.max(resetAt - Date.now(), 1000)
      console.warn(`Rate limit exhausted — waiting ${waitMs}ms`)
      await sleep(waitMs)
      return this.request(path, options)
    }

    if (!res.ok) {
      const body = await res.text()
      throw new GitHubError(res.status, path, body)
    }

    return res.json()
  }

  async getPullRequest(owner, repo, prNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}`)
  }

  async getPullRequestDiff(owner, repo, prNumber) {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
      {
        headers: {
          ...this.headers,
          Accept: 'application/vnd.github.diff',
        },
      },
    )
    if (!res.ok) throw new GitHubError(res.status, `diff:${owner}/${repo}/${prNumber}`, await res.text())
    return res.text()
  }

  // Handles pagination automatically — returns all pages merged
  async getPullRequestFiles(owner, repo, prNumber) {
    const files = []
    let page = 1
    while (true) {
      const batch = await this.request(
        `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
      )
      files.push(...batch)
      if (batch.length < 100) break
      page++
    }
    return files
  }

  async getPullRequestCommits(owner, repo, prNumber) {
    return this.request(`/repos/${owner}/${repo}/pulls/${prNumber}/commits`)
  }

  async getRepoContents(owner, repo, path, ref) {
    const q = ref ? `?ref=${encodeURIComponent(ref)}` : ''
    return this.request(`/repos/${owner}/${repo}/contents/${path}${q}`)
  }

  // List merged PRs for historical ingestion (Trung's memory pipeline)
  async listMergedPRs(owner, repo, { perPage = 30, page = 1 } = {}) {
    return this.request(
      `/repos/${owner}/${repo}/pulls?state=closed&per_page=${perPage}&page=${page}`,
    )
  }
}

export class GitHubError extends Error {
  constructor(status, resource, body) {
    super(`GitHub API error ${status} on ${resource}: ${body}`)
    this.status = status
    this.resource = resource
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
