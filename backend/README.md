# TestSense AI — Backend

Node.js backend for TestSense AI: GitHub OAuth sign-in, project CRUD, and
CockroachDB access — designed to run as a single AWS Lambda function behind
an API Gateway REST API, with a zero-dependency local dev server for
day-to-day development.

See the root [`README.md`](../README.md) for the whole-project overview,
[`docs/API.md`](../docs/API.md) for the endpoint reference,
[`docs/AUTH_FLOW.md`](../docs/AUTH_FLOW.md) for the OAuth/session design, and
[`docs/DATABASE.md`](../docs/DATABASE.md) for the schema.

## Structure

```
backend/
├── src/
│   ├── handlers/       # One file per route (auth/, repositories/, projects/)
│   ├── services/       # Business logic + external integrations (GitHub, secrets, sessions, users, projects)
│   ├── repositories/   # Raw parameterized SQL against CockroachDB
│   ├── middleware/     # requireAuth, withErrorHandling
│   ├── utils/          # errors, response shaping, signing, cookies, validation, logging
│   ├── config/         # env, github, db, cors, routes
│   ├── index.js         # Lambda entrypoint (exports `handler`)
│   └── localServer.js   # Local dev HTTP server (translates to/from the same event shape)
├── scripts/
│   └── checkSyntax.js   # Zero-dependency "build" step (node --check on every source file)
├── tests/               # node:test suites
└── package.json
```

## Prerequisites

- Node.js 20+ (developed/tested against Node 22).
- A CockroachDB instance (only required to actually run authenticated
  requests end-to-end — see "What runs without a database" below).

## Setup

```bash
cd backend
npm install
cp .env.example .env
# then edit .env — see docs/AUTH_FLOW.md for how to register a GitHub OAuth App
```

## Running locally

```bash
npm run dev     # node --watch src/localServer.js, restarts on file changes
# or
npm start        # node src/localServer.js, no watch
```

Listens on `http://localhost:$PORT` (default `3001`).

## Lint, test, build

```bash
npm run lint      # eslint .
npm test          # node --test "tests/**/*.test.js"
npm run build     # syntax-validates every file in src/ (no bundler needed — Lambda runs Node source directly)
```

## What runs without a database

Everything that doesn't touch CockroachDB works out of the box with just
the `.env` placeholders filled in with *fake-but-valid-looking* values
(`SECRETS_PROVIDER=local` avoids needing AWS too):

- `GET /auth/github/login` — redirects to GitHub's real authorize URL (still
  needs a real registered OAuth App's client id to actually complete sign-in
  with GitHub, but the redirect itself works with any client id).
- `GET /auth/me`, `GET /repositories`, `GET/POST/PATCH/DELETE /projects*` —
  all correctly return `401 UNAUTHENTICATED` JSON when there's no session,
  and CORS/OPTIONS preflight work, without touching the database.
- The full `npm test` suite (63 tests) — all pure logic, signed
  tokens/cookies, and mocked GitHub/DB interactions, no live services
  required.

Actually completing a sign-in and exercising `/projects` end-to-end as an
authenticated user requires a real GitHub OAuth App **and** a reachable
CockroachDB with the migrations in `../database/migrations/` applied.

## Deploying (not yet done)

`src/index.js`'s `handler` export is meant to sit behind a single API
Gateway REST API `{proxy+}` resource with `ANY` method and Lambda proxy
integration — see `docs/API.md`'s "Deployment shape" section. No IaC
(SAM/Serverless Framework/CDK) has been written yet; that's a reasonable
next step once AWS credentials are available to the team.
