# Team Handoff — GitHub OAuth + Project CRUD

Branch: `feature/github-project-connection` (off `main`, not merged, not
pushed — everything below is uncommitted and open for review).

This document exists so you can understand what changed without reading
every source file. It's long on purpose — skim the section headers, read
what's relevant to what you're about to touch.

---

## 1. Work Completed

**Frontend**
- Real (non-mock) API service layer with an explicit mock/demo mode switch.
- Auth-aware Navbar, Landing page (real "Sign in with GitHub", no fake
  login, OAuth-error display).
- Projects page: real data loading, plus a distinct "sign in required"
  state for 401s.
- Connect Repository flow: real GitHub sign-in check, real repository list,
  real project creation, real error states — no more fake "Authorize" step.
- Project Workspace: real project load (401 / not-found / backend-error
  states), and a newly-interactive Settings tab (rename, change default
  branch/test framework, disconnect/delete) wired to the real update/delete
  endpoints. Pull Requests / Memory tabs gracefully show "not connected yet"
  placeholders instead of crashing on missing mock-only fields.

**Backend** (new, `backend/`)
- GitHub OAuth App authorization-code flow: login, callback, current-user,
  logout.
- GitHub repository listing + per-repository access verification.
- Project CRUD (list/create/get/update/delete) with per-user ownership
  enforcement, idempotent duplicate-repository handling, and consistent
  error responses.
- Shared infrastructure: signed-cookie sessions, signed OAuth `state`,
  CORS, structured error handling, a hand-rolled router shared by a Lambda
  entrypoint and a zero-dependency local dev server.

**Database** (new, `database/`)
- `users` and `projects` tables (CockroachDB SQL migrations, not yet run
  against a live database — see section 12).

**Authentication / Security**
- HttpOnly signed session cookie (not `localStorage`, never exposed to
  React).
- GitHub OAuth tokens never touch the database directly — stored via a
  Secrets Manager abstraction (AWS or local in-memory), only a reference
  string lives in `users.oauth_secret_reference`.

**Documentation**
- `README.md` (root) rewritten for the full-stack architecture.
- `backend/README.md`, `docs/API.md`, `docs/AUTH_FLOW.md`,
  `docs/DATABASE.md`, `docs/PENDING_INTEGRATIONS.md` (new).
- This file.

---

## 2. Files Created

### Backend — config

| File | Purpose | Exports | Used by | Status |
|---|---|---|---|---|
| `backend/src/config/env.js` | Central, lazy env var access | `env` object of getters | everything | Production-ready |
| `backend/src/config/github.js` | GitHub OAuth scopes + URLs | `GITHUB_OAUTH_SCOPES`, `GITHUB_URLS` | `githubOAuthService.js` | **Pending Han** — scopes are a placeholder minimal set |
| `backend/src/config/db.js` | `pg` connection pool factory | `getPool`, `closePool` | repositories | Production-ready code, **not run against a live DB** |
| `backend/src/config/cors.js` | CORS header builder | `buildCorsHeaders` | router, response utils | Production-ready, revisit for multi-origin support |
| `backend/src/config/routes.js` | Single method+path -> handler table | `routes` | `index.js`, `localServer.js` | Production-ready |

### Backend — utils

| File | Purpose | Exports | Status |
|---|---|---|---|
| `backend/src/utils/errors.js` | Typed app errors (statusCode + code) | `AppError`, `ValidationError`, `UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `ConflictError` | Production-ready |
| `backend/src/utils/response.js` | Consistent `{data}`/`{error}` JSON responses | `successResponse`, `errorResponse`, `noContentResponse` | Production-ready |
| `backend/src/utils/logger.js` | Structured, secret-safe logging | `logger` | Production-ready |
| `backend/src/utils/validation.js` | Manual input validators | `requireString`, `optionalString`, `requireInteger`, `requireBoolean`, `parseJsonBody` | Production-ready |
| `backend/src/utils/signing.js` | HMAC-signed-token primitive (not JWT) | `createSignedToken`, `verifySignedToken` | Production-ready, documented limitations (signed not encrypted) |
| `backend/src/utils/oauthState.js` | OAuth CSRF `state` built on `signing.js` | `createOAuthState`, `verifyOAuthState` | Production-ready; **no single-use/replay tracking** (documented limitation) |
| `backend/src/utils/cookies.js` | Cookie header parse/serialize | `parseCookies`, `serializeCookie` | Production-ready |
| `backend/src/utils/serializers.js` | snake_case DB row -> camelCase API DTO | `toUserDto`, `toProjectDto` | Production-ready |
| `backend/src/utils/router.js` | Path-param route matcher | `matchRoute` | Production-ready |

### Backend — middleware

| File | Purpose | Exports | Status |
|---|---|---|---|
| `backend/src/middleware/withErrorHandling.js` | Wraps a handler so every thrown error becomes the consistent JSON error shape | `withErrorHandling` | Production-ready |
| `backend/src/middleware/requireAuth.js` | Extracts + verifies the session cookie | `requireAuth` (throws 401), `getOptionalUserId` (returns null) | Production-ready |

### Backend — services

| File | Purpose | Exports | Status |
|---|---|---|---|
| `backend/src/services/sessionService.js` | Issue/verify/clear the session cookie | `createSessionCookieHeader`, `createLogoutCookieHeader`, `getUserIdFromSessionToken` | Production-ready, documented limitation (no server-side revocation) |
| `backend/src/services/githubOAuthService.js` | GitHub OAuth endpoints via `fetch` | `buildGitHubAuthorizationUrl`, `exchangeCodeForAccessToken`, `fetchAuthenticatedGitHubUser` | Production-ready code; **not exercised against a real GitHub OAuth App** (no client id/secret available here) |
| `backend/src/services/githubRepositoryService.js` | GitHub repo listing + access check | `listRepositoriesForUser`, `fetchRepositoryForUser` | Same as above |
| `backend/src/services/userService.js` | Find-or-create user, token retrieval | `findOrCreateUserFromGitHubProfile`, `getUserGitHubToken`, `findUserById` | Production-ready, **not run against a live DB** |
| `backend/src/services/projectService.js` | Project business logic (validation, ownership, idempotent duplicate handling) | `listProjects`, `getProject`, `createProject`, `updateProject`, `deleteProject` | Production-ready; dependency-injectable (`deps` param) for testing |
| `backend/src/services/secrets/secretsService.js` | GitHub-token-specific facade over a provider | `storeGitHubToken`, `getGitHubToken`, `deleteGitHubToken` | Production-ready |
| `backend/src/services/secrets/awsSecretsProvider.js` | AWS Secrets Manager implementation | `awsSecretsProvider` | Code complete, **not exercised against real AWS** |
| `backend/src/services/secrets/localSecretsProvider.js` | In-memory dev/test provider | `localSecretsProvider` | Dev/test-only by design, never for production |

### Backend — repositories (raw SQL)

| File | Purpose | Exports | Status |
|---|---|---|---|
| `backend/src/repositories/usersRepository.js` | Parameterized `users` queries | `findUserByGithubUserId`, `findUserById`, `createUser`, `updateUserProfile` | Code complete, **not run against a live DB**; unit-tested against a fake client |
| `backend/src/repositories/projectsRepository.js` | Parameterized, user-scoped `projects` queries | `listProjectsForUser`, `findProjectByIdForUser`, `findProjectByRepositoryForUser`, `createProjectRecord`, `updateProjectRecord`, `deleteProjectRecord` | Same as above |

### Backend — handlers (one per route)

| File | Route |
|---|---|
| `backend/src/handlers/auth/login.js` | `GET /auth/github/login` |
| `backend/src/handlers/auth/callback.js` | `GET /auth/github/callback` |
| `backend/src/handlers/auth/me.js` | `GET /auth/me` |
| `backend/src/handlers/auth/logout.js` | `POST /auth/logout` |
| `backend/src/handlers/repositories/listRepositories.js` | `GET /repositories` |
| `backend/src/handlers/projects/listProjects.js` | `GET /projects` |
| `backend/src/handlers/projects/createProject.js` | `POST /projects` |
| `backend/src/handlers/projects/getProject.js` | `GET /projects/{projectId}` |
| `backend/src/handlers/projects/updateProject.js` | `PATCH /projects/{projectId}` |
| `backend/src/handlers/projects/deleteProject.js` | `DELETE /projects/{projectId}` |

All handlers: production-ready code, verified end-to-end for everything not
requiring a live database (see section 12); DB-dependent paths unit-tested
only.

### Backend — entrypoints, tests, config

| File | Purpose | Status |
|---|---|---|
| `backend/src/index.js` | Lambda `handler` export, dispatches via `config/routes.js` | Production-ready, **never deployed to real Lambda/API Gateway** |
| `backend/src/localServer.js` | Zero-dependency local HTTP dev server | Production-ready for local dev |
| `backend/scripts/checkSyntax.js` | `npm run build` — syntax-validates every `src/*.js` file | Production-ready |
| `backend/eslint.config.js` | Backend ESLint config (Node globals) | Production-ready |
| `backend/package.json` / `package-lock.json` | Backend dependencies + scripts | Production-ready |
| `backend/.env.example` | Placeholder env vars only | No real secrets |
| `backend/README.md` | Backend-specific setup/usage doc | — |
| `backend/tests/*.test.js` (10 files, 63 tests) | `node:test` suites — see section 12 | All passing |
| `backend/tests/helpers/testEnv.js` | Fake env vars shared by test files | Test-only |

### Database

| File | Purpose | Status |
|---|---|---|
| `database/migrations/0001_create_users.sql` | `users` table | Written, **not executed against a live DB** |
| `database/migrations/0002_create_projects.sql` | `projects` table + FK/unique/indexes | Same |
| `database/README.md` | How to apply migrations, pointer to `docs/DATABASE.md` | — |

### Frontend

| File | Purpose | Exports | Status |
|---|---|---|---|
| `src/config/apiConfig.js` | Real-vs-mock switch | `API_MODE`, `API_BASE_URL` | Production-ready |
| `src/services/ApiError.js` | Typed error for non-2xx backend responses | `ApiError` | Production-ready |
| `src/services/realApi.js` | Real `fetch`-based implementation of every API function | `beginGitHubLogin`, `getCurrentUser`, `logout`, `getRepositories`, `getProjects`, `getProjectById`, `createProject`, `updateProject`, `deleteProject` | Production-ready |
| `src/services/mockApi.js` | Explicit offline mock implementation (same function names) | Same names as above | Demo/mock-only by design |
| `src/hooks/useCurrentUser.js` | Shared auth-status hook (`loading`/`signed-in`/`signed-out`) | `useCurrentUser` | Production-ready |

`src/services/api.js` was **modified**, not created — see section 3.

---

## 3. Files Modified

| File | What changed | Why | Affects |
|---|---|---|---|
| `src/services/api.js` | Rewritten from a single mock implementation into a thin switcher re-exporting either `realApi.js` or `mockApi.js` based on `API_MODE`. `connectRepository()` is gone, replaced by `createProject()`/`updateProject()`/`deleteProject()`. | Real backend integration; explicit, non-blended mock mode. | Anyone importing `connectRepository` from the old API — it no longer exists. Anyone adding a new API function should add it to **both** `realApi.js` and `mockApi.js`, then re-export it here. |
| `src/components/layout/Navbar.jsx` | Now auth-aware: shows "Sign in with GitHub" when signed out, avatar/username + sign-out when signed in; "Connect Repository" link only shows when signed in. | Reflects real auth state instead of always showing a static link. | None — purely additive UI logic. |
| `src/pages/LandingPage.jsx` | Hero CTA is now conditional on auth status; real `beginGitHubLogin()` call instead of a static link; renders an `auth_error` query-param banner. | "Do not fake a successful OAuth login" requirement. | None. |
| `src/pages/ProjectsPage.jsx` | Added a distinct `unauthenticated` status (401) separate from generic `error`, with its own empty state + sign-in CTA. | Real backend returns 401 for signed-out users; needed a real state to handle it well. | None. |
| `src/pages/ConnectRepositoryPage.jsx` | Step 1 is now a real auth-status check + real GitHub redirect (was a fake "click to authorize" toggle). Step 2 loads real repositories. Step 4 calls real `createProject()` with real error display. Step 5 navigates to the real created project's id. | Core deliverable — replace the mock connect flow with real integration. | None — this page owned entirely by this task. |
| `src/pages/ProjectWorkspacePage.jsx` | Added `unauthenticated`/`error` states alongside the existing `not-found`. Pull Requests/Memory/Generated Tests tabs now treat `undefined` fields as empty instead of crashing. Settings tab rewritten from read-only to a real interactive form (rename/branch/test framework + save) plus a real delete/disconnect flow with a confirm step. | Real data doesn't have the mock-only nested fields (PRs/memory/metrics); "update or delete the project" was an explicit requirement not previously implemented anywhere. | **Whoever builds the real Pull Requests/Memory tabs (Han/Trung's future work) should replace the `undefined` checks in `PullRequestsTab`/`MemoryTab` with a real fetch — see the code comments right above each.** |
| `src/components/projects/ProjectCard.jsx` | `memoryCount`/`openPullRequests`/`lastSyncedAt` are now rendered conditionally (only if present); sync status labels handle `pending` (a real backend status the old mock data never used). | Real backend projects don't have those fields yet. | None. |
| `.env.example` (root) | Replaced the single `VITE_GITHUB_CLIENT_ID` placeholder with `VITE_API_MODE` and a clarified `VITE_API_BASE_URL`; explicitly notes the frontend never needs a GitHub client id/secret. | Frontend no longer needs those — the backend owns all GitHub OAuth config. | None. |
| `README.md` (root) | Fully rewritten for the full-stack architecture (was frontend-only). | Scope of this task. | Read before editing anything else in the repo — folder structure, workflow, and doc pointers all changed. |

---

## 4. Important Code Flow

**GitHub sign-in** — user clicks "Sign in with GitHub" (`Navbar.jsx`,
`LandingPage.jsx`, or `ConnectRepositoryPage.jsx` step 1) → calls
`beginGitHubLogin(redirectTo)` (`src/services/realApi.js`) → full-page
redirect to `GET {API_BASE_URL}/auth/github/login`.

**OAuth callback** — `backend/src/handlers/auth/login.js` validates
`redirect_to` against an allowlist, creates a signed `state`
(`backend/src/utils/oauthState.js`), and 302s to GitHub's authorize URL
(built in `backend/src/services/githubOAuthService.js`'s
`buildGitHubAuthorizationUrl`). GitHub eventually redirects to
`backend/src/handlers/auth/callback.js`, which verifies `state`, exchanges
the code for a token (`exchangeCodeForAccessToken`), and fetches the
GitHub profile (`fetchAuthenticatedGitHubUser`).

**Token storage** — `backend/src/services/userService.js`'s
`findOrCreateUserFromGitHubProfile` calls
`backend/src/services/secrets/secretsService.js`'s `storeGitHubToken`,
which picks the AWS or local provider and writes the token, returning an
opaque reference stored in `users.oauth_secret_reference` via
`usersRepository.js`'s `createUser`/`updateUserProfile`. The callback
handler then issues the session cookie
(`sessionService.createSessionCookieHeader`) and redirects back into the
SPA.

**Repository retrieval** — `src/pages/ConnectRepositoryPage.jsx` step 2
calls `getRepositories()` → `GET /repositories` →
`backend/src/handlers/repositories/listRepositories.js` → looks up the
user, retrieves their token via `userService.getUserGitHubToken`
(`secretsService.getGitHubToken` under the hood), and calls
`githubRepositoryService.listRepositoriesForUser`.

**Project creation** — step 4's "Connect Repository" button calls
`createProject(projectData)` → `POST /projects` →
`backend/src/handlers/projects/createProject.js` →
`projectService.createProject`, which validates input, confirms repository
access via `githubRepositoryService.fetchRepositoryForUser` (never trusting
the client's repository id/owner/name blindly), checks for an existing
`(user, repository)` connection (`projectsRepository.findProjectByRepositoryForUser`
— idempotent return if found), and otherwise inserts a new row
(`createProjectRecord`). The frontend navigates to
`/projects/{createdProject.id}` on success.

**Project list loading** — `src/pages/ProjectsPage.jsx` calls
`getProjects()` → `GET /projects` → `listProjects.js` →
`projectService.listProjects` → `projectsRepository.listProjectsForUser`
(scoped by `user_id`).

**Project detail loading** — `src/pages/ProjectWorkspacePage.jsx` calls
`getProjectById(projectId)` → `GET /projects/{projectId}` →
`getProject.js` → `projectService.getProject` →
`projectsRepository.findProjectByIdForUser` (scoped by both `id` and
`user_id` — this is the actual ownership enforcement point, not just a
check in the handler).

**Project update/deletion** — the Workspace's Settings tab calls
`updateProject`/`deleteProject` → `PATCH`/`DELETE /projects/{projectId}` →
`updateProject.js`/`deleteProject.js` → `projectService.updateProject` /
`.deleteProject`, both re-checking ownership before touching the row.

---

## 5. API Endpoints

See [`docs/API.md`](API.md) for the full table (request/response shapes,
every error code, the 404-vs-403 security policy, and the CORS/deployment
notes). Summary:

| Method | Route | Handler | Auth |
|---|---|---|---|
| GET | `/auth/github/login` | `handlers/auth/login.js` | none |
| GET | `/auth/github/callback` | `handlers/auth/callback.js` | none |
| GET | `/auth/me` | `handlers/auth/me.js` | required |
| POST | `/auth/logout` | `handlers/auth/logout.js` | none |
| GET | `/repositories` | `handlers/repositories/listRepositories.js` | required |
| GET | `/projects` | `handlers/projects/listProjects.js` | required |
| POST | `/projects` | `handlers/projects/createProject.js` | required |
| GET | `/projects/{projectId}` | `handlers/projects/getProject.js` | required |
| PATCH | `/projects/{projectId}` | `handlers/projects/updateProject.js` | required |
| DELETE | `/projects/{projectId}` | `handlers/projects/deleteProject.js` | required |

All implemented and unit-tested; `/auth/*` and error paths independently
verified live against a real running backend (see section 12).

---

## 6. Database Changes

Full column-level detail in [`docs/DATABASE.md`](DATABASE.md). Summary:

**`users`** — PK `id` (UUID), unique `github_user_id`, plus
`oauth_secret_reference` (opaque pointer, never a raw token).

**`projects`** — PK `id` (UUID, the stable identifier future features
reference), FK `user_id -> users(id) ON DELETE CASCADE`, unique
`(user_id, repository_id)` (enables idempotent duplicate-connection
handling), indexes on `user_id` and `repository_full_name`.

**For Han:** future PR/ingestion tables should have
`project_id UUID REFERENCES projects(id) ON DELETE CASCADE`.

**For Trung:** future memory/embedding tables should have the same
`project_id UUID REFERENCES projects(id) ON DELETE CASCADE` pattern.
`projects.memory_indexing_enabled` (boolean) already exists as a per-project
toggle for this feature to read.

No memory or PR tables were created — out of scope by explicit instruction.

---

## 7. Security Notes

- **Secrets storage:** GitHub OAuth tokens go through
  `backend/src/services/secrets/secretsService.js` → AWS Secrets Manager
  (`SECRETS_PROVIDER=aws`) or an in-memory local provider
  (`SECRETS_PROVIDER=local`, the default). The `users` table only ever
  stores the reference string.
- **Never commit:** `backend/.env`/`.env` (only `.env.example` files are
  tracked), any real `GITHUB_CLIENT_SECRET`, `OAUTH_STATE_SECRET`,
  `SESSION_SECRET`, `DATABASE_URL` with real credentials, or AWS
  credentials. Verified clean in this change — see section 12.
- **Local mock token storage:** `localSecretsProvider.js` keeps tokens in
  an in-memory `Map`, never written to disk. Restarting the dev server
  forgets everything. Never used outside local dev.
- **OAuth `state` validation:** signed + expiry-checked
  (`backend/src/utils/oauthState.js`), not stored server-side (see
  `docs/AUTH_FLOW.md` for why). **Limitation:** no single-use/nonce
  tracking, so a captured state value could be replayed within its 10-minute
  window.
- **Session limitations:** signed HttpOnly cookie, not a server-side store
  — logout clears the browser's copy but doesn't revoke a copy captured
  elsewhere. Cookie is signed, not encrypted — never put anything besides
  the user id in it.
- **CORS assumptions:** single allowed origin (`CORS_ALLOWED_ORIGIN`,
  default `http://localhost:5173`) with credentials allowed. Revisit before
  supporting multiple frontend origins.
- **IAM permissions needed (AWS provider):** `secretsmanager:CreateSecret`,
  `PutSecretValue`, `GetSecretValue`, `DeleteSecret`, scoped to
  `<SECRETS_NAME_PREFIX>/github-oauth-token/*`.
- **Local-dev-only shortcuts:** `COOKIE_SECURE=false` by default (must be
  `true` once served over HTTPS); `SECRETS_PROVIDER=local` (must be `aws`
  in any shared/deployed environment).
- **Before production:** add single-use OAuth state tracking, move to a
  revocable session mechanism, set `COOKIE_SECURE=true`, switch to
  `SECRETS_PROVIDER=aws`, add rate limiting.

---

## 8. GitHub Permissions and Han Dependency

- **Assumed scopes** (`backend/src/config/github.js`):
  `read:user` (identify the user) + `public_repo` (list/read public repos).
  Deliberately **not** `repo` (would add private-repo write-level access
  this flow doesn't need).
- **Pending Han:** the final scope list, and whether private-repository
  support is required at all.
- **What must change after Han confirms:** the `GITHUB_OAUTH_SCOPES` array
  and its comment in `backend/src/config/github.js`; the scope discussion
  in `docs/AUTH_FLOW.md`.
- **OAuth App vs GitHub App:** this implementation assumes a classic
  **OAuth App** (simplest fit for sign-in alone). If Han's research points
  to a GitHub App instead (e.g. for installation tokens / first-class
  webhook management), only `githubOAuthService.js`'s token exchange and
  `config/github.js` need to change — session handling, the DB schema, and
  Secrets Manager do not.
- **Risk of requesting permissions too broad:** users see a scarier consent
  screen and the app holds more access than it uses (bad security posture,
  bad trust signal). **Too narrow:** Han's PR ingestion may fail later if
  it needs something `public_repo` doesn't grant (e.g. private repos, PR
  write access) — would require re-authorization of every existing user.
- **Webhook creation:** not implemented, not started — fully deferred to
  Han, out of scope for this task by explicit instruction.

---

## 9. Trung Dependency

- **What's ready:** `projects.id` (a stable `UUID`, never regenerated) and
  `projects.memory_indexing_enabled` (a boolean toggle, already editable
  from the Workspace Settings tab, but not read by anything yet).
- **Intentionally not implemented:** any memory/embedding table, any
  retrieval endpoint, the analytics/similar-examples panel — per explicit
  instruction not to implement Trung's assigned work.
- **What Trung will need to connect later:** a new table referencing
  `projects.id` (illustrative shape in `docs/DATABASE.md`), a retrieval
  endpoint, and swapping `src/pages/ProjectWorkspacePage.jsx`'s `MemoryTab`
  from its current "not connected yet" placeholder to a real fetch (the
  `project.memoryEntries === undefined` check is the exact spot to replace
  — see the comment directly above `MemoryTab`).
- **Schema assumptions Trung should know:** one project = one connected
  GitHub repository for one user; there is currently no concept of a
  project being shared across multiple users, so memory records are
  implicitly single-user-scoped through their `project_id`.

---

## 10. Environment Variables

### Frontend (`.env`, read via `import.meta.env`)

| Variable | Read by | Purpose | Required? | Local example | Frontend-safe? | Sensitive? |
|---|---|---|---|---|---|---|
| `VITE_API_MODE` | `src/config/apiConfig.js` | `real` or `mock` | Optional (defaults `real`) | `real` | Yes | No |
| `VITE_API_BASE_URL` | `src/config/apiConfig.js` | Backend base URL | Optional (defaults `http://localhost:3001`) | `http://localhost:3001` | Yes | No |

### Backend (`backend/.env`, read via `backend/src/config/env.js`)

| Variable | Purpose | Required? | Local example | Sensitive? |
|---|---|---|---|---|
| `NODE_ENV` | dev/prod switch | Optional (default `development`) | `development` | No |
| `APP_BASE_URL` | Frontend origin, used for OAuth redirects | Optional | `http://localhost:5173` | No |
| `API_BASE_URL` | This API's own base URL (docs only) | Optional | `http://localhost:3001` | No |
| `CORS_ALLOWED_ORIGIN` | CORS allow-origin | Optional | `http://localhost:5173` | No |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client id | **Required** | `Iv1.xxxxxxxx` | No (but keep private) |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | **Required** | — | **Yes** |
| `GITHUB_CALLBACK_URL` | Must match the OAuth App's registered callback | Optional | `http://localhost:3001/auth/github/callback` | No |
| `OAUTH_STATE_SECRET` | Signs the OAuth CSRF state | **Required** | long random hex | **Yes** |
| `SESSION_SECRET` | Signs the session cookie | **Required** | long random hex (different from above) | **Yes** |
| `SESSION_COOKIE_NAME` | Cookie name | Optional | `testsense_session` | No |
| `SESSION_TTL_SECONDS` | Session lifetime | Optional | `604800` | No |
| `COOKIE_SECURE` | `Secure` cookie flag | Optional (default `false`) | `false` locally, `true` in prod | No |
| `SECRETS_PROVIDER` | `local` or `aws` | Optional (default `local`) | `local` | No |
| `AWS_REGION` | AWS region for Secrets Manager | Optional | `us-east-1` | No |
| `SECRETS_NAME_PREFIX` | Namespaces secrets per environment | Optional | `testsense-ai/dev` | No |
| `DATABASE_URL` | CockroachDB connection string | **Required** | `postgresql://user:pass@host:26257/db` | **Yes** |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | TLS verification in production | Optional (default `true`) | `true` | No |

No real values for any of the above exist anywhere in this change — only
placeholders in the two `.env.example` files.

---

## 11. Commands Run

```bash
# Branch setup
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feature/github-project-connection

# Backend dependency install
npm install                 # backend/package.json context
# (ran as: npm --prefix backend install from repo root in some steps)

# Frontend
npm run lint
npm run build

# Backend
npm --prefix backend run lint
npm --prefix backend run build     # scripts/checkSyntax.js
npm --prefix backend test          # node --test "tests/**/*.test.js"

# Manual live smoke tests (local dev server, no real DB)
node src/localServer.js   # backend, with fake-but-valid env vars
curl .../auth/github/login   # confirmed 302 to github.com with correct params
curl .../auth/me              # confirmed 401 UNAUTHENTICATED JSON
curl .../projects              # confirmed 401 UNAUTHENTICATED JSON
curl -X OPTIONS .../projects    # confirmed CORS preflight 204 + headers
curl .../nope                    # confirmed 404 ROUTE_NOT_FOUND JSON

# Full frontend+backend browser smoke test (Playwright, headless Chromium)
# - Landing page unauthenticated state
# - Projects page 401 -> "sign in" empty state
# - Connect Repository step 1 -> real sign-in button
# - Clicking "Sign in with GitHub" -> verified real redirect all the way to
#   github.com's login page with correct client_id/redirect_uri/scope/state

# Secrets/gitignore hygiene
git status --porcelain=v1 -uall
grep -rEn "AKIA[0-9A-Z]{16}|ghp_...|gho_...|BEGIN PRIVATE KEY" backend/ src/ docs/ database/
git check-ignore -v backend/node_modules backend/dist dist node_modules
```

---

## 12. Test Results

**Backend automated tests:** 63/63 passing (`node:test`, zero added test
framework dependency). Coverage: input validation
(`validation.test.js`), signed-token round-trip/tamper/expiry
(`signing.test.js`), OAuth state (`oauthState.test.js`), session cookie
issuance/verification (`sessionService.test.js`), secrets abstraction
round-trip via the local provider (`secretsService.test.js`), repository
layer SQL/parameter contract + user-scoping
(`projectsRepository.test.js`), full project-service business logic —
ownership, idempotent duplicates, not-found, validation
(`projectService.test.js`), auth middleware + error-handling middleware
(`middleware.test.js`), and GitHub OAuth/repository service behavior
against a mocked `fetch` (`githubOAuthService.test.js`,
`githubRepositoryService.test.js`).

**Nothing failed and needed fixing during this pass** — all 63 passed on
first full run after the dependency-injection refactor of
`projectService.js` (see section 2).

**Could not be run:** any test that would require a live CockroachDB
connection (the migrations were never executed against a live database —
no instance was available). Repository-layer tests substitute a fake
`db.query`-shaped object instead, which proves the SQL/parameter contract
but not that CockroachDB itself filters correctly.

**External credentials that would be needed for fuller testing:** a
registered GitHub OAuth App (to complete an actual sign-in past GitHub's
login page) and a reachable CockroachDB instance (to persist/read real
rows).

**What *was* verified live** (not just unit tests): the local dev server
was actually started and hit with `curl` and a real headless-Chromium
browser session — confirming the OAuth login redirect reaches GitHub's
real authorize/login page with correct parameters, `/auth/me` and
`/projects` correctly return `401` when signed out, CORS preflight and
headers are correct, unknown routes 404 correctly, and the frontend's
Landing/Projects/Connect-Repository pages render the correct
signed-out/unauthenticated UI states end-to-end against the real backend
(screenshots taken).

**Frontend:** `npm run lint` and `npm run build` both pass. No new
frontend test framework was added (none existed before; the task allowed
skipping frontend tests if none exist).

---

## 13. Current Working Features

**Fully working locally (no external credentials needed):**
- OAuth login redirect generation, signed state, CORS, all 401/404/error
  JSON responses, the entire local dev server + router.
- Frontend auth-aware UI (Navbar, Landing, Projects, Connect Repository
  step 1, Project Workspace) correctly handling signed-out/unauthenticated
  states against a real running backend.
- All 63 backend unit tests.
- Explicit frontend mock mode (`VITE_API_MODE=mock`) — full click-through
  demo with zero backend.

**Working only with mocks:** the entire frontend `mockApi.js` path (by
design — it's the explicit demo mode, not meant to touch anything real).

**Implemented but requiring GitHub credentials:** completing an actual
sign-in (needs a real registered OAuth App's client id/secret) — the
redirect/callback/session code itself is complete and tested, just never
exercised past GitHub's own login page here.

**Implemented but requiring AWS credentials:** `SECRETS_PROVIDER=aws` path
(`awsSecretsProvider.js`) — code complete, never run against real AWS.

**Implemented but requiring CockroachDB:** every DB-backed operation —
user creation/lookup, project create/list/get/update/delete against real
data. Code complete and unit-tested against a fake DB client; never run
against a live database.

**Deferred because of Han:** PR ingestion, PR list/detail data, webhook
handling, final OAuth scope/App-type decision.

**Deferred because of Trung:** memory/embedding storage and retrieval,
analytics/similar-examples panel.

---

## 14. Known Limitations

- Sessions are not revocable server-side (cookie-only, no session table).
- OAuth `state` has no single-use/replay tracking beyond its 10-minute
  expiry.
- Local Secrets Manager provider is in-memory/non-persistent — dev-only.
- No rate limiting anywhere.
- CORS assumes exactly one frontend origin.
- No IaC (SAM/Serverless Framework/CDK) written yet — Lambda/API Gateway
  deployment is designed for but not automated.
- Database migrations have never been executed against a live database.
- GitHub OAuth flow has never completed past GitHub's login page (no real
  OAuth App registered in this environment).
- `projectService.js`'s dependency-injection pattern (`deps` parameter) is
  a light convention, not a full DI framework — keep following it for new
  service functions so they stay unit-testable without a real DB/GitHub.

---

## 15. Team Integration Notes

**Before editing:** branch off `main` (`git switch -c feature/your-thing`)
— this is now a single-branch workflow, no `develop`.

**Files likely to cause merge conflicts** if Han/Trung are also editing
around the same time:
- `src/pages/ProjectWorkspacePage.jsx` (all three of PR/Memory/Settings
  tabs live here — Han and Trung will each want to touch this file).
- `docs/PENDING_INTEGRATIONS.md` (expected to be updated by whoever
  resolves an item).
- `database/migrations/` (new migration files are additive — use a new
  numbered file, don't edit `0001`/`0002`).

**Interfaces to reuse, not duplicate:**
- `backend/src/middleware/requireAuth.js` for any new authenticated
  handler.
- `backend/src/middleware/withErrorHandling.js` for any new handler.
- `backend/src/utils/errors.js`'s error classes for consistent error
  responses — don't hand-roll a new error shape.
- `backend/src/services/projectService.js`'s `deps`-parameter pattern for
  any new service that needs to stay unit-testable.
- `src/services/api.js` as the only import point for API calls from pages
  — never import `realApi.js`/`mockApi.js` directly from a page.

**How to add a new backend endpoint:**
1. Add a handler file under `backend/src/handlers/<area>/`.
2. Wrap it in `withErrorHandling`; use `requireAuth(event)` if it needs a
   signed-in user.
3. Register it in `backend/src/config/routes.js`.
4. Add tests under `backend/tests/`.
5. Document it in `docs/API.md`.

**How to add a new database repository:** follow
`backend/src/repositories/projectsRepository.js`'s pattern — parameterized
queries only, every function takes an optional trailing `db` parameter
defaulting to `getPool()` from `config/db.js`, so it stays testable with a
fake client.

**How to connect future PR ingestion (Han):** create a migration for a
`pull_requests`-style table referencing `projects.id`; add a
`pullRequestsRepository.js` following the pattern above; add endpoint(s)
per the "how to add an endpoint" steps; replace the `undefined` check in
`ProjectWorkspacePage.jsx`'s `PullRequestsTab` with a real fetch.

**How to connect future memory retrieval (Trung):** same pattern — a new
table referencing `projects.id`, a repository file, an endpoint, and
replacing `MemoryTab`'s `undefined` check with a real fetch.

---

## 16. Pending Decisions

| Decision | Owner | Why it matters | Current assumption | File/config affected |
|---|---|---|---|---|
| Final GitHub OAuth scopes | Han | Widening later forces re-auth of every user | `read:user` + `public_repo` (narrowest useful set) | `backend/src/config/github.js` |
| OAuth App vs GitHub App | Han | Affects token exchange flow and webhook capability | Classic OAuth App | `backend/src/services/githubOAuthService.js`, `config/github.js` |
| Webhook design | Han | Determines new ingestion endpoints | Not started | N/A yet |
| PR data contract | Han | Determines `PullRequestsTab`'s real shape | Empty placeholder | `src/pages/ProjectWorkspacePage.jsx` |
| Embedding model / memory schema | Trung | Determines new table shape and retrieval endpoint | Not started; `memory_indexing_enabled` toggle exists only | `database/migrations/`, `src/pages/ProjectWorkspacePage.jsx` |
| Session revocation strategy | Team | Current design has no server-side revocation | Signed cookie only | `backend/src/services/sessionService.js` |
| Multi-origin CORS support | Team | Only one frontend origin supported today | Single `CORS_ALLOWED_ORIGIN` | `backend/src/config/cors.js` |

---

## 17. Recommended Message to the Team

> Backend is up: GitHub OAuth sign-in, project CRUD (create/read/update/delete),
> and CockroachDB schema for `users`/`projects` are all implemented and
> unit-tested (63 passing tests), plus the frontend is fully wired to the
> real API with a working sign-in flow, connect-repository flow, and a new
> interactive project Settings tab (rename/branch/delete). Verified live:
> the OAuth redirect genuinely reaches GitHub, and every page correctly
> shows sign-in-required states when logged out.
>
> Still needed before this is fully live: a registered GitHub OAuth App and
> a reachable CockroachDB instance (nothing here touched either — see
> `docs/AUTH_FLOW.md`/`docs/DATABASE.md` for exact setup steps). AWS
> Secrets Manager is optional for now (`SECRETS_PROVIDER=local` works for
> dev).
>
> **Han** — I need your final scope/OAuth-App-vs-GitHub-App decision before
> we lock in `backend/src/config/github.js`; see
> `docs/PENDING_INTEGRATIONS.md` for exactly what's pending and why I kept
> it minimal. The Project Workspace's Pull Requests tab has a clean
> placeholder ready for your data.
>
> **Trung** — `projects.id` (UUID) is stable and ready for you to reference
> from memory/embedding tables whenever that's ready; see `docs/DATABASE.md`
> for the exact FK pattern. Memory tab has a placeholder ready too.
>
> Everything's on `feature/github-project-connection`, not merged yet —
> please review before it goes into `main`.

---

## 18. Recommended Next Steps

1. Register a real GitHub OAuth App + provision a CockroachDB instance; run
   the migrations; complete one real end-to-end sign-in.
2. Get Han's scope/App-type decision, update `config/github.js`.
3. Decide on `SECRETS_PROVIDER=aws` timeline and IAM policy.
4. Write IaC for the Lambda + API Gateway deployment.
5. Add OAuth-state single-use tracking and reconsider session revocation
   before any real production traffic.
6. Once Han/Trung's schemas land, wire `PullRequestsTab`/`MemoryTab` to
   real endpoints.
