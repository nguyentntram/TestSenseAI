# Authentication Flow

## Summary

TestSense AI uses a classic **GitHub OAuth App** authorization-code flow
(not a GitHub App — see the "OAuth App vs GitHub App" section below, which
is an assumption pending Han's confirmation). The backend never exposes a
GitHub access token to the frontend; the frontend only ever holds an
HttpOnly session cookie.

## Step by step

1. **User clicks "Sign in with GitHub"** (Navbar, Landing page, or the
   Connect Repository page's first step). The frontend calls
   `beginGitHubLogin(redirectTo)` (`src/services/realApi.js`), which is a
   full-page redirect to `GET {API_BASE_URL}/auth/github/login?redirect_to=...`
   — not a `fetch` call, since this has to end with the browser on
   github.com.

2. **`GET /auth/github/login`** (`backend/src/handlers/auth/login.js`):
   - Validates `redirect_to` against a small allowlist (`/`, `/projects`,
     `/connect-repository`) to prevent an open-redirect vulnerability.
   - Generates a signed, short-lived `state` value (`backend/src/utils/oauthState.js`)
     carrying `{ purpose, nonce, redirectTo }`, signed with `OAUTH_STATE_SECRET`.
   - 302-redirects to GitHub's authorize URL
     (`backend/src/services/githubOAuthService.js`) with `client_id`, the
     configured scopes, and that `state`.

3. **GitHub shows its consent screen**, then redirects the browser to
   `GET /auth/github/callback?code=...&state=...`.

4. **`GET /auth/github/callback`** (`backend/src/handlers/auth/callback.js`):
   - Verifies `state`'s signature and expiry. Invalid/expired/missing ->
     redirect to `{APP_BASE_URL}/?auth_error=invalid_state` (see below —
     this endpoint never returns a JSON error body, since it's only ever
     reached via full-page browser redirect).
   - Exchanges `code` for a GitHub access token
     (`githubOAuthService.exchangeCodeForAccessToken`).
   - Fetches the authenticated GitHub user's profile
     (`githubOAuthService.fetchAuthenticatedGitHubUser`).
   - Finds or creates the local `users` row
     (`backend/src/services/userService.js`).
   - Stores the access token via the Secrets Manager abstraction
     (`backend/src/services/secrets/secretsService.js`) — the `users` row
     only ever gets `oauth_secret_reference`, never the raw token.
   - Issues the session cookie (`sessionService.createSessionCookieHeader`)
     and 302-redirects to `{APP_BASE_URL}{redirectTo}`.

5. **Frontend lands back on the SPA already signed in.** `useCurrentUser()`
   (`src/hooks/useCurrentUser.js`) calls `GET /auth/me` on mount; the
   session cookie is sent automatically (`credentials: 'include'`), so the
   user shows as signed in with no further action.

6. **Every subsequent authenticated request** (`GET /repositories`,
   `/projects*`) goes through `backend/src/middleware/requireAuth.js`, which
   reads the session cookie, verifies its signature/expiry, and extracts
   `userId` — throwing `UnauthenticatedError` (401) otherwise.

7. **Sign out**: `POST /auth/logout` clears the cookie
   (`sessionService.createLogoutCookieHeader`). This does **not** revoke the
   GitHub token itself, and does not invalidate any other copy of the same
   cookie already issued (see Limitations below).

## OAuth `state` design (serverless-friendly CSRF protection)

A traditional "store state server-side, compare on callback" approach
doesn't fit well here: `/login` and `/callback` may run in different Lambda
invocations (even different containers), so there is no reliable in-memory
place to stash the state between the two requests without adding a
database round-trip just for this.

Instead, `state` is a **self-contained signed value**
(`backend/src/utils/signing.js` + `oauthState.js`): a base64url JSON payload
plus an HMAC-SHA256 signature, using `OAUTH_STATE_SECRET`. The callback
verifies the signature and a 10-minute expiry instead of doing a lookup.
This blocks forgery (an attacker without the secret cannot produce a valid
state) and bounds replay to that 10-minute window.

**Known limitation:** this does not prevent a single legitimate state value
from being replayed more than once within that window (no single-use/nonce
tracking store). Acceptable for an MVP; a hardening step would add a
short-TTL single-use store (a CockroachDB table or a cache) keyed by the
`nonce` already embedded in the payload.

## Session design

Sessions are also a signed HttpOnly cookie (`testsense_session` by
default), not a server-side session table — this keeps the backend
stateless, matching the Lambda deployment model. The cookie carries only
`{ purpose, userId, iat, exp }`.

**Known limitations (documented, not hidden):**
- **No server-side revocation.** Logout only stops the browser from sending
  the cookie; if a valid cookie value was somehow captured elsewhere, it
  remains valid until it expires (`SESSION_TTL_SECONDS`, default 7 days).
  A production hardening step would move to a server-side session table (or
  short-lived tokens with rotation) so logout — or an admin action — can
  truly invalidate a session.
- **Signed, not encrypted.** The payload (`purpose`, `userId`, timestamps)
  is base64-readable by anyone holding the cookie. Never put a GitHub token
  or anything sensitive in it — only the local user id.
- **`COOKIE_SECURE`** must be set to `true` once the frontend and backend
  are actually served over HTTPS (`backend/.env.example`). It defaults to
  `false` for plain-HTTP local development.

## OAuth App vs GitHub App (pending Han)

This implementation assumes a classic **GitHub OAuth App**
(`github.com/login/oauth/authorize` + `/login/oauth/access_token`), because
that's the simplest fit for "sign in with GitHub" alone, and it's what the
assigned endpoint shapes (`/auth/github/login`, `/auth/github/callback`)
naturally match.

Han is researching GitHub API/webhook requirements for **PR ingestion**,
which may conclude the team needs a **GitHub App** instead (e.g. for
installation-scoped tokens, or webhook management tied to an app
installation rather than a user token). If that happens, the pieces that
need to change are narrow and already isolated:

- `backend/src/config/github.js` — scopes/permission list.
- `backend/src/services/githubOAuthService.js` — token exchange endpoint
  and request shape (GitHub Apps use a slightly different flow/token type).
- `.env` variables (`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` -> possibly
  App ID + private key for a GitHub App's server-to-server flow, while the
  user-authorization redirect flow stays conceptually similar).

Everything downstream (session handling, Secrets Manager storage, the
`users`/`projects` schema) does not need to change either way.

See `docs/PENDING_INTEGRATIONS.md` for the full list of items waiting on
Han and Trung.

## GitHub OAuth App registration (for local development)

Create one at <https://github.com/settings/developers> -> "New OAuth App":

| Field | Value |
|---|---|
| Application name | TestSense AI (dev) |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:3001/auth/github/callback` |

Put the generated client id/secret into `backend/.env` (never commit them —
see `backend/.env.example`).

## What cannot run without real credentials

- The entire flow above requires a real `GITHUB_CLIENT_ID` /
  `GITHUB_CLIENT_SECRET` (a registered OAuth App) — with the placeholder
  values in `.env.example`, GitHub will reject the authorize request.
- Token storage requires either `SECRETS_PROVIDER=local` (in-memory, works
  with no AWS account, but is non-persistent and dev-only) or a real AWS
  account with Secrets Manager access for `SECRETS_PROVIDER=aws`.
- User/project persistence requires a reachable CockroachDB instance
  (`DATABASE_URL`) with the migrations in `database/migrations/` applied.

None of this was available in the development environment this change was
built in — see `docs/PENDING_INTEGRATIONS.md` and the root README's
"What requires real cloud credentials" section for exactly what was and
wasn't exercised.
