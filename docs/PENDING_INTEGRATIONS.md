# Pending Integrations

Everything in this file is a placeholder, assumption, or configuration point
left open because it depends on work another team member hasn't finished
yet. Nothing here is a permanent decision — each item says what's missing,
who owns it, why it's needed, what was left incomplete, and what has to
change once the real answer arrives.

## Pending on Han (PR Ingestion & Analysis)

### 1. GitHub OAuth scopes

- **What's missing:** the exact set of GitHub permissions PR ingestion
  needs (e.g. does reading PR diffs/comments require more than
  `public_repo`? Do webhooks need a separate permission?).
- **Why it's needed:** the scopes requested at sign-in time are set once,
  up front, in the OAuth authorize URL — widening them later means every
  existing user has to re-authorize.
- **What was left incomplete:** `backend/src/config/github.js` centralizes
  the scope list as `GITHUB_OAUTH_SCOPES = ['read:user', 'public_repo']` —
  intentionally the narrowest useful set (identify the user, read public
  repos), explicitly not `repo` (which would add private-repo write-level
  access this flow doesn't need).
- **What must change after Han confirms:** update the array in
  `backend/src/config/github.js` (and the comment above it), and update
  `docs/AUTH_FLOW.md`'s scope discussion. If private repository support
  turns out to be required, this is also where that decision gets made.

### 2. GitHub OAuth App vs. GitHub App

- **What's missing:** whether the team should register a classic OAuth App
  (what this change assumes) or a GitHub App (needed for installation
  tokens / first-class webhook management).
- **Why it's needed:** this affects the token exchange flow, the token
  type returned, and how webhooks would eventually be registered.
- **What was left incomplete:** `backend/src/services/githubOAuthService.js`
  implements the classic OAuth App authorization-code flow only. No GitHub
  App installation flow exists.
- **What must change after Han confirms:** if a GitHub App is required,
  `githubOAuthService.js`'s token exchange and `backend/src/config/github.js`
  are the two files to change; the database schema, session handling, and
  Secrets Manager abstraction do not need to change either way. See
  `docs/AUTH_FLOW.md`'s "OAuth App vs GitHub App" section for detail.

### 3. Webhook creation/handling

- **What's missing:** whether/when the team registers GitHub webhooks, and
  what payloads PR ingestion expects.
- **Why it's needed:** out of scope for this task by explicit instruction.
- **What was left incomplete:** no webhook endpoint, signature verification,
  or webhook registration exists anywhere in this change. This is fully
  deferred, not started.
- **What must change:** Han's webhook design determines a new set of
  handlers/endpoints entirely; nothing here needs to be reworked to
  accommodate it, since it doesn't touch the auth/project code paths.

### 4. PR ingestion data contracts / PR list & detail pages

- **What's missing:** Han's wireframes and ingestion contracts for PR data.
- **Why it's needed:** out of scope for this task by explicit instruction.
- **What was left incomplete:** the Project Workspace's "Pull Requests" tab
  (`src/pages/ProjectWorkspacePage.jsx`, `PullRequestsTab`) renders an empty
  state ("Pull request data isn't connected yet") whenever
  `project.pullRequests` is undefined — which it always will be from the
  real backend today, since no `pull_requests` table exists.
- **What must change after Han's work lands:** a new `pull_requests` table
  referencing `projects.id` (see `docs/DATABASE.md`), a new
  `GET /projects/{projectId}/pull-requests`-style endpoint (or however Han's
  contract shapes it), and `PullRequestsTab` swapped to fetch real data
  instead of reading `project.pullRequests`.

## Pending on Trung (Memory & Retrieval)

### 5. Memory/embedding schema and retrieval

- **What's missing:** Trung's choice of Bedrock embedding model and the
  resulting vector column type/dimensions.
- **Why it's needed:** out of scope for this task by explicit instruction
  ("do not create memory tables yet").
- **What was left incomplete:** no `memory_records` (or similarly-named)
  table exists. `projects.memory_indexing_enabled` (a boolean column) exists
  as a per-project toggle for this future feature, but nothing reads or
  writes it yet beyond the Settings tab's save form. The Project Workspace's
  "Memory" tab (`MemoryTab` in `src/pages/ProjectWorkspacePage.jsx`) renders
  an empty state whenever `project.memoryEntries` is undefined.
- **What must change after Trung's work lands:** a new memory/embedding
  table referencing `projects.id UUID` (see the illustrative SQL in
  `docs/DATABASE.md`), a retrieval endpoint, and `MemoryTab` swapped to
  fetch real data.

### 6. Analytics / similar-examples panel

- **What's missing:** Trung's wireframe and prototype query.
- **Why it's needed:** out of scope for this task.
- **What was left incomplete:** nothing exists for this yet; not
  represented anywhere in the current frontend or backend.

## Not blocked on anyone (already resolved by this change)

For clarity — these were sometimes adjacent to Han/Trung's territory but
did **not** block this task and are fully implemented:

- GitHub OAuth sign-in (App-registration-dependent, not Han/Trung-dependent).
- `users` and `projects` tables and their relationship.
- Project CRUD (create/read/update/delete) with ownership enforcement.
- Secrets Manager abstraction for the OAuth token.
- Frontend integration for sign-in, project list, connect-repository flow,
  and project settings (update/delete).

## How to update this file

When Han or Trung's research lands, update the relevant section above to
say what was decided, then either delete the resolved item or mark it
"Resolved on <date>: <summary>" instead of removing it outright, so the
history of what was assumed and why stays visible in git blame.
