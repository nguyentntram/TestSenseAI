# TestSense AI (Coco)

## 1. Project Overview

TestSense AI (internally nicknamed **Coco**) is an AI-powered testing
assistant. It connects to a GitHub repository, learns from that
repository's historical tests, bug fixes, pull requests, and testing
conventions, and — eventually — uses that history as context to generate
more meaningful unit and integration tests for new pull requests.

## 2. Problem Being Solved

Generic AI test generators only look at the diff in front of them. They
don't know which edge cases your team has already been bitten by, what
testing conventions your repository already uses, or which parts of the
codebase are historically fragile. TestSense AI closes that gap by building
a "memory" of a repository's testing history and using it as context when
generating tests — producing tests relevant to *this* codebase, not a
generic one.

## 3. Main Planned Features

- Connect a GitHub repository and continuously index its history.
- Build a searchable "repository memory" from past bug fixes, PRs, and test
  patterns (vector embeddings for retrieval).
- Automatically generate context-aware unit/integration tests for new pull
  requests.
- Surface generated tests, memory entries, and pull request activity in a
  per-project workspace.
- Secure, permissioned access to connected repositories.

## 4. Architecture

```
Browser (React SPA, Vite)
   │  fetch, credentials: 'include' (HttpOnly session cookie)
   ▼
Backend (Node.js, single Lambda handler / local HTTP server)
   │                              │
   │  GitHub REST + OAuth API     │  parameterized SQL (pg)
   ▼                              ▼
GitHub                       CockroachDB (users, projects)
   ▲
   │ token stored via
   ▼
AWS Secrets Manager (or an in-memory local dev provider)
```

- **Frontend:** React + Vite + Tailwind CSS + React Router, JavaScript (no
  TypeScript). See `src/`.
- **Backend:** Node.js handlers shaped for API Gateway REST proxy
  integration, one shared route table drives both a Lambda entrypoint and a
  zero-dependency local dev server. See `backend/`.
- **Database:** CockroachDB (PostgreSQL wire-compatible) via `pg`. See
  `database/` and `docs/DATABASE.md`.
- **Secrets:** GitHub OAuth tokens are stored through a provider
  abstraction — AWS Secrets Manager in real environments, an in-memory
  provider for local development. The database only ever stores an opaque
  reference, never the raw token.
- **Auth:** classic GitHub OAuth App authorization-code flow; application
  session is a signed HttpOnly cookie (not a token in `localStorage`, not
  exposed to React). See `docs/AUTH_FLOW.md`.

This is a hackathon-scale MVP architecture, not a hardened production
system — see "Security Notes" below and each doc's "Limitations" sections
for the specific tradeoffs made and what to change before shipping this for
real users.

## 5. Frontend and Backend Folder Structure

```
src/                           # Frontend (React + Vite)
├── components/
│   ├── common/                 # Button, Badge, EmptyState, LoadingState, PageContainer, StepIndicator
│   ├── layout/                  # Navbar, Footer, AppLayout
│   ├── projects/                 # ProjectCard
│   └── repositories/              # RepositoryCard
├── config/                      # apiConfig.js (real vs. mock switch)
├── data/                         # Mock data (used only in explicit mock mode)
├── hooks/                        # useCurrentUser.js
├── pages/                        # One component per route
├── routes/                       # AppRoutes.jsx
├── services/                     # api.js (switch), realApi.js, mockApi.js, ApiError.js
├── utils/                        # format.js
├── App.jsx / main.jsx / index.css

backend/                       # Backend (Node.js)
├── src/
│   ├── handlers/                 # One file per route (auth/, repositories/, projects/)
│   ├── services/                  # GitHub OAuth/API, secrets, sessions, users, projects
│   ├── repositories/               # Raw parameterized SQL
│   ├── middleware/                 # requireAuth, withErrorHandling
│   ├── utils/                       # errors, response shaping, signing, cookies, validation, logging
│   ├── config/                      # env, github, db, cors, routes
│   ├── index.js                      # Lambda entrypoint
│   └── localServer.js                # Local dev HTTP server
├── scripts/checkSyntax.js         # Zero-dependency "build" step
├── tests/                          # node:test suites
└── package.json

database/
├── migrations/                  # SQL migrations (users, projects)
└── README.md

docs/
├── API.md                       # Full endpoint reference
├── AUTH_FLOW.md                 # OAuth + session design in detail
├── DATABASE.md                  # Schema, relationships, what Han/Trung should reference
├── PENDING_INTEGRATIONS.md      # Everything waiting on Han/Trung, and why
└── TEAM_HANDOFF.md              # Detailed handoff notes for this change
```

## 6. Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 20+ (built/tested against Node 22) — same
  requirement for both frontend and backend.
- npm (bundled with Node.js).
- Optional, only needed to exercise the backend fully: a reachable
  CockroachDB instance, a registered GitHub OAuth App, and (for
  `SECRETS_PROVIDER=aws`) an AWS account with Secrets Manager access.

### Installing Node.js if it's missing

- **Windows/macOS:** download the LTS installer from
  [nodejs.org](https://nodejs.org/).
- **macOS (Homebrew):** `brew install node`
- **Windows (winget):** `winget install OpenJS.NodeJS.LTS`
- **Linux (nvm):**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install --lts
  ```

### Verifying Node and npm versions

```bash
node --version
npm --version
```

You should see Node `v20.x`+ and npm `10.x`+.

## 7. Clone and Branch

```bash
git clone https://github.com/nguyentntram/TestSenseAI.git
cd TestSenseAI
git switch main
git pull origin main
git switch -c feature/your-feature-name
```

(This repository uses a single-branch `main`-based workflow — see
"Branch and PR Workflow" below.)

## 8. Install Dependencies

Frontend and backend have **separate** `package.json` files and must be
installed separately:

```bash
# Frontend (repo root)
npm install

# Backend
cd backend
npm install
cd ..
```

## 9. Configure Local Environment Placeholders

Two separate `.env.example` files — copy each and fill in real values only
where you have them:

```bash
cp .env.example .env                   # frontend
cp backend/.env.example backend/.env   # backend
```

Frontend `.env` only needs `VITE_API_MODE` (`real` or `mock`) and
`VITE_API_BASE_URL`. It never needs a GitHub client id/secret — see
`.env.example`'s comment. Backend `.env` needs the GitHub OAuth App
credentials, signing secrets, secrets-provider selection, and
`DATABASE_URL` — see `backend/.env.example` and `docs/AUTH_FLOW.md`.

## 10. Run the Frontend

```bash
npm run dev
```

Vite prints a local URL (typically `http://localhost:5173`).

By default (`VITE_API_MODE=real`), the frontend expects the backend running
at `VITE_API_BASE_URL` (default `http://localhost:3001`). Set
`VITE_API_MODE=mock` in `.env` to run the frontend standalone against
in-memory demo data instead (no backend required) — useful for UI work that
doesn't need real auth/data.

## 11. Run the Backend Locally

```bash
cd backend
npm run dev      # node --watch, restarts on changes
```

Listens on `http://localhost:3001` by default. Auth-required endpoints
correctly return `401` without a database; see `backend/README.md`'s "What
runs without a database" section for exactly what does and doesn't need
CockroachDB running.

## 12. Lint and Tests

```bash
# Frontend
npm run lint
npm run build

# Backend
cd backend
npm run lint
npm test          # node --test, 63 tests
npm run build     # syntax-validates every backend source file
```

## 13. API Endpoint Table

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/github/login` | none | Redirect to GitHub's authorize URL |
| GET | `/auth/github/callback` | none | GitHub redirects here; establishes the session |
| GET | `/auth/me` | required | Current signed-in user |
| POST | `/auth/logout` | none | Clears the session cookie |
| GET | `/repositories` | required | List the signed-in user's GitHub repositories |
| GET | `/projects` | required | List the caller's own projects |
| POST | `/projects` | required | Connect a repository as a new project (idempotent) |
| GET | `/projects/{projectId}` | required | Get one project (404 if not the caller's) |
| PATCH | `/projects/{projectId}` | required | Update project fields |
| DELETE | `/projects/{projectId}` | required | Disconnect/delete a project |

Full request/response shapes, error codes, and the 404-vs-403 security
policy: [`docs/API.md`](docs/API.md).

## 14. OAuth Flow (summary)

Sign in with GitHub → backend redirect to GitHub → GitHub redirects back
with a code → backend exchanges it for a token → backend finds/creates the
local user → token stored via Secrets Manager (only a reference goes in the
database) → signed HttpOnly session cookie issued → frontend is signed in.
Full step-by-step, the CSRF `state` design, and known limitations:
[`docs/AUTH_FLOW.md`](docs/AUTH_FLOW.md).

## 15. Database Schema (summary)

Two tables: `users` (one row per GitHub sign-in) and `projects` (one row
per connected repository, `UUID` id, unique per `(user_id, repository_id)`,
every query scoped by `user_id`). Full column tables, indexes, and how
Han's PR data / Trung's memory data should reference `projects.id`:
[`docs/DATABASE.md`](docs/DATABASE.md).

## 16. Secrets Manager Behavior (summary)

`backend/src/services/secrets/secretsService.js` picks an AWS or local
in-memory provider based on `SECRETS_PROVIDER`. Naming:
`<SECRETS_NAME_PREFIX>/github-oauth-token/<userId>`. Full IAM permissions
needed and provider details: [`docs/AUTH_FLOW.md`](docs/AUTH_FLOW.md) and
inline comments in `backend/src/services/secrets/awsSecretsProvider.js`.

## 17. Required AWS Services

- **Secrets Manager** — GitHub OAuth token storage (`SECRETS_PROVIDER=aws`).
  IAM permissions needed: `secretsmanager:CreateSecret`,
  `PutSecretValue`, `GetSecretValue`, `DeleteSecret`, scoped to a resource
  ARN matching `<SECRETS_NAME_PREFIX>/github-oauth-token/*`.
- **Lambda** + **API Gateway** — hosting the backend (not yet deployed; see
  `docs/API.md`'s "Deployment shape").
- CockroachDB itself is not an AWS service (CockroachDB Cloud/Serverless or
  self-hosted).

None of this has been provisioned or exercised against real AWS in this
change — see "What Requires Real Cloud Credentials" below.

## 18. Required GitHub OAuth App Settings

Register at <https://github.com/settings/developers> → "New OAuth App":

| Field | Local dev value |
|---|---|
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:3001/auth/github/callback` |

Put the generated client id/secret in `backend/.env`. Never commit them.

## 19. Callback URL Examples

| Environment | Callback URL |
|---|---|
| Local dev | `http://localhost:3001/auth/github/callback` |
| Example staging | `https://api-staging.testsense.ai/auth/github/callback` |
| Example production | `https://api.testsense.ai/auth/github/callback` |

A separate GitHub OAuth App (separate client id/secret) is needed per
environment, since each app has exactly one callback URL configured.

## 20. Branch and PR Workflow

This project uses a **single-branch `main`-based workflow** (no `develop`):

```bash
git switch main
git pull origin main
git switch -c feature/your-feature-name
# ... work, commit ...
git push -u origin feature/your-feature-name
```

Open a PR targeting `main`. Before requesting review:

```bash
npm run lint && npm run build              # frontend
cd backend && npm run lint && npm test && npm run build   # backend
```

Get at least one teammate's review before merging. Prefer a small, focused
PR over one that bundles unrelated changes. Do not merge directly into
`main` without review.

## 21. What Currently Works

- GitHub OAuth sign-in redirect, callback, session issuance, and sign-out
  (needs a real registered OAuth App to complete an actual GitHub sign-in;
  the redirect/callback/session/error-handling code itself is fully
  implemented and unit-tested).
- Full project CRUD with per-user ownership enforcement, idempotent
  duplicate-repository handling, and consistent error responses (needs a
  reachable CockroachDB to persist anything).
- Frontend: real auth-aware Navbar/Landing page, Projects page (loading /
  empty / error / unauthenticated / no-search-result states), full 5-step
  Connect Repository flow against the real API, and a Project Workspace
  page with working Settings (rename, change default branch/test
  framework, disconnect/delete) wired to the real update/delete endpoints.
- An explicit offline mock mode (`VITE_API_MODE=mock`) for frontend-only
  demos with zero backend/database — never silently mixed with real data.
- 63 backend tests (`node:test`, no added test framework) covering
  validation, ownership enforcement, duplicate handling, not-found,
  unauthenticated requests, error-response shape, the secrets abstraction,
  and mocked GitHub API behavior.

## 22. What Requires Real Cloud Credentials

- **A real GitHub OAuth App** (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`) —
  without one, `/auth/github/login` redirects to GitHub but GitHub will
  reject the request.
- **A reachable CockroachDB** (`DATABASE_URL`) with
  `database/migrations/*.sql` applied — without one, every endpoint that
  reads/writes `users`/`projects` fails when it reaches the database call
  (auth's redirect steps and every unauthenticated-request 401 response
  still work fine without it, since those don't touch the database).
- **A real AWS account** — only if `SECRETS_PROVIDER=aws`; the default
  `SECRETS_PROVIDER=local` needs no AWS account at all for local
  development (see the tradeoffs in `docs/AUTH_FLOW.md`).

None of the above were available in the environment this change was built
in — everything not requiring them was exercised directly (see
`docs/TEAM_HANDOFF.md` for the exact list of what was and wasn't run).

## 23. What Is Waiting on Han

GitHub OAuth scope finalization, OAuth-App-vs-GitHub-App decision, webhook
design, and the PR ingestion data contract (which the Project Workspace's
"Pull Requests" tab is already shaped to receive once it exists). Full
detail, including exactly what code changes once Han's research lands:
[`docs/PENDING_INTEGRATIONS.md`](docs/PENDING_INTEGRATIONS.md).

## 24. What Is Waiting on Trung

Memory/embedding schema and retrieval, and the analytics/similar-examples
panel. `projects.id` (a stable UUID) and a `projects.memory_indexing_enabled`
toggle already exist for this to build on. Full detail:
[`docs/PENDING_INTEGRATIONS.md`](docs/PENDING_INTEGRATIONS.md).

## 25. Security Notes (Limitations)

This is an MVP-grade design with several explicit, documented shortcuts —
not oversights:

- **Sessions are a signed HttpOnly cookie, not a server-side session
  store.** Logout only stops the browser from sending the cookie; it does
  not revoke a previously-issued cookie value server-side. See
  `docs/AUTH_FLOW.md`.
- **OAuth `state` is signed + time-limited (10 min), not single-use.** No
  nonce-tracking store exists yet to prevent replay within that window.
- **The signed cookie/state format is signed, not encrypted** — never put
  anything sensitive in the payload (only a user id).
- **`COOKIE_SECURE=false` by default** for local HTTP development; must be
  `true` once served over HTTPS.
- **The local Secrets Manager provider is in-memory and non-persistent** —
  never used in a deployed environment; selected via `SECRETS_PROVIDER`.
- **CORS** is currently permissive to one configured origin with
  credentials allowed — fine for one known frontend origin, revisit before
  supporting multiple frontend origins.
- **No rate limiting** on any endpoint yet.

## 26. Recommended Next Steps

1. Register a real GitHub OAuth App and a CockroachDB instance; run the
   migrations; do a full end-to-end sign-in test.
2. Decide and provision `SECRETS_PROVIDER=aws` with the IAM policy in
   `docs/AUTH_FLOW.md`.
3. Get Han's scope/App-type decision and update
   `backend/src/config/github.js` accordingly.
4. Write the IaC (SAM/Serverless Framework/CDK) for the Lambda + API
   Gateway deployment described in `docs/API.md`.
5. Add a single-use nonce store for OAuth `state` and consider a
   server-side session store, before any real production traffic.
6. Once Han/Trung's schemas land, wire the Project Workspace's Pull
   Requests/Memory tabs to real endpoints instead of their current
   "not connected yet" empty states.
