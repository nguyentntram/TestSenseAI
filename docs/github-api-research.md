# GitHub API & Webhooks — Research Notes (Han, Week 1)

## Auth Scopes Needed

### GitHub OAuth App scopes (used by Tram's OAuth sign-in flow)

| Scope | Why we need it |
|---|---|
| `repo` | Read PR metadata, diffs, and changed files for **private** repos. Grants read + write access — consider `read:repository` if GitHub adds it. |
| `public_repo` | Same as above scoped to public repos only. Use this when the connected repo is public to minimize permission surface. |
| `read:user` | Read the authenticated user's profile (name, login, avatar) for display in the UI. |
| `user:email` | Read the user's primary email for our `users` table. |

> Tram stores the OAuth token in AWS Secrets Manager. Han's webhook handler reads it to make authenticated API calls on behalf of the project owner.

### GitHub App permissions (alternative / preferred long-term)

GitHub Apps are more granular than OAuth Apps. Recommended permissions:

| Permission | Level | Why |
|---|---|---|
| Pull requests | Read | List PRs, read PR body, head/base refs, labels |
| Contents | Read | Fetch file diffs (`/repos/{owner}/{repo}/pulls/{pr}/files`) |
| Metadata | Read | Required baseline for any repo access |
| Webhooks | Read & Write | Register and manage the `pull_request` webhook automatically on project connect |

---

## Webhook Events

### Event to subscribe to: `pull_request`

Register one webhook per connected repository (Tram's connect-repo flow triggers this).

**Actions Han's handler must handle:**

| Action | Trigger |
|---|---|
| `opened` | New PR — kick off analysis immediately |
| `synchronize` | New commits pushed to existing PR — re-run analysis |
| `reopened` | Closed PR re-opened — treat like `opened` |
| `closed` (merged) | PR merged — mark as `merged`, persist final state |
| `closed` (not merged) | PR closed without merge — mark as `closed`, skip analysis |

Actions to **ignore** for now: `labeled`, `unlabeled`, `assigned`, `review_requested`, `ready_for_review`, `converted_to_draft`.

### Webhook payload fields Han's handler extracts

```json
{
  "action": "opened",
  "number": 482,
  "pull_request": {
    "id": 123456789,
    "number": 482,
    "title": "Add support for partial refunds",
    "body": "...",
    "state": "open",
    "user": { "login": "jchen" },
    "head": { "ref": "feature/partial-refunds", "sha": "abc123" },
    "base": { "ref": "main", "sha": "def456" },
    "additions": 124,
    "deletions": 38,
    "changed_files": 3,
    "created_at": "2026-07-15T11:00:00Z",
    "updated_at": "2026-07-17T09:30:00Z"
  },
  "repository": {
    "id": 987654321,
    "full_name": "acme-corp/payment-service"
  }
}
```

### Webhook Signature Verification (HMAC-SHA256)

Every incoming webhook must be verified before processing:

```js
import { createHmac, timingSafeEqual } from 'crypto'

function verifyWebhookSignature(payload, signature, secret) {
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

- Secret stored in **AWS Secrets Manager**, not in env vars or code.
- If verification fails → return HTTP 401 immediately, log the attempt.

---

## API Endpoints Han's Lambda Will Call

### 1. List PR files (changed files + diff stats)
```
GET /repos/{owner}/{repo}/pulls/{pull_number}/files
```
Returns: array of `{ filename, status, additions, deletions, patch }`.
- `patch` is the raw unified diff for that file.
- Paginated (default 30, max 100 files per page) — Han must handle pagination for large PRs.

### 2. Get PR diff (full unified diff)
```
GET /repos/{owner}/{repo}/pulls/{pull_number}
Accept: application/vnd.github.diff
```
Returns the full diff as plain text. Use for feeding into Anh's generation Lambda.

### 3. Get PR commits
```
GET /repos/{owner}/{repo}/pulls/{pull_number}/commits
```
Useful for `commitsCount` field and linking commit messages into memory.

---

## Rate Limits

| Auth type | Limit |
|---|---|
| Unauthenticated | 60 req/hour/IP |
| OAuth token | 5,000 req/hour/token |
| GitHub App installation token | 15,000 req/hour/installation |

**Han's strategy:** Use the project owner's OAuth token (stored by Tram in Secrets Manager). Monitor `X-RateLimit-Remaining` in Lambda responses. If < 100, log a warning. If 0, exponential back-off before retrying (coordinate with Han's retry logic).

---

## Database Tables Han Owns

### `pull_requests`
```sql
CREATE TABLE pull_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id),
  github_pr_id  BIGINT NOT NULL,
  number        INT NOT NULL,
  title         TEXT NOT NULL,
  author        TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('open', 'merged', 'closed', 'draft')),
  head_branch   TEXT NOT NULL,
  base_branch   TEXT NOT NULL,
  additions     INT NOT NULL DEFAULT 0,
  deletions     INT NOT NULL DEFAULT 0,
  commits_count INT NOT NULL DEFAULT 0,
  webhook_status TEXT NOT NULL DEFAULT 'pending'
                 CHECK (webhook_status IN ('pending', 'analyzing', 'analyzed', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, github_pr_id)
);
```

### `changed_files`
```sql
CREATE TABLE changed_files (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  path           TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('added', 'modified', 'deleted', 'renamed')),
  additions      INT NOT NULL DEFAULT 0,
  deletions      INT NOT NULL DEFAULT 0,
  patch          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON changed_files (pull_request_id);
```

---

## Open Questions for the Team

1. **Webhook secret rotation** — should Tram's connect-repo flow regenerate the secret on re-connect, or keep a single secret per repo?
2. **Large PR throttling** — PRs with > 300 changed files hit GitHub's file-list pagination hard. Do we skip analysis or page through all files?
3. **Diff storage** — should Han store the raw unified diff in S3 (for large diffs) or inline in CockroachDB (simpler, works for typical PR sizes)?
4. **Re-trigger** — does the UI need a manual "re-analyze" button, or is re-push to the branch enough?
