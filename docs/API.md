# API Reference

Base URL locally: `http://localhost:3001` (see `backend/.env.example`'s
`API_BASE_URL`). In production this would sit behind an API Gateway REST
API custom domain instead.

## Conventions

**Success shape:**

```json
{ "data": { "...": "..." } }
```

**Error shape:**

```json
{ "error": { "code": "PROJECT_NOT_FOUND", "message": "Project was not found." } }
```

Every handler is wrapped in `backend/src/middleware/withErrorHandling.js`,
which guarantees this shape and makes sure an unexpected/internal error
never leaks a stack trace, SQL text, or secret value to the client — only a
generic `INTERNAL_ERROR` message goes out; the real error is logged
server-side only (`backend/src/utils/logger.js`).

**Auth:** session is an HttpOnly cookie (see `docs/AUTH_FLOW.md`), sent
automatically by the browser. There is no `Authorization: Bearer` header in
this design.

**Security policy for ownership:** a project that doesn't exist and a
project that exists but belongs to a different user both return
`404 PROJECT_NOT_FOUND`, never `403`. This is deliberate: returning `403`
for "exists but isn't yours" would let a caller enumerate other users'
project ids by noticing 403 vs 404. See
`backend/src/handlers/projects/getProject.js` for the comment where this is
decided.

## Endpoints

### Auth

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| GET | `/auth/github/login` | `handlers/auth/login.js` | none | 302 redirect to GitHub's authorize URL. Optional `?redirect_to=` query param, restricted to an allowlist (`/`, `/projects`, `/connect-repository`). |
| GET | `/auth/github/callback` | `handlers/auth/callback.js` | none | GitHub redirects here with `?code=&state=`. Always responds with a 302 back into the frontend — success sets the session cookie and redirects to `redirect_to`; any failure redirects to `/?auth_error=<reason>` instead of returning JSON (this endpoint is only ever reached via full-page browser redirect, so a JSON body would be a dead end for the user). |
| GET | `/auth/me` | `handlers/auth/me.js` | required | Returns the signed-in user's profile. `401 UNAUTHENTICATED` if not signed in — the frontend treats that as "signed out", not an error. |
| POST | `/auth/logout` | `handlers/auth/logout.js` | none | Clears the session cookie. Returns `{ "data": { "loggedOut": true } }`. |

### Repositories

| Method | Path | Handler | Auth | Notes |
|---|---|---|---|---|
| GET | `/repositories` | `handlers/repositories/listRepositories.js` | required | Lists the authenticated user's GitHub repositories (owner + collaborator), via the token stored in Secrets Manager — never a client-supplied token. |

### Projects

| Method | Path | Handler | Auth | Request | Notes |
|---|---|---|---|---|---|
| GET | `/projects` | `handlers/projects/listProjects.js` | required | — | Only the caller's own projects. |
| POST | `/projects` | `handlers/projects/createProject.js` | required | `{ repositoryOwner, repositoryName, name?, description?, defaultBranch?, testFramework? }` | Verifies the repository is accessible to the authenticated GitHub user before creating. Idempotent for a duplicate `(user, repository)` connection — returns the existing project instead of erroring. Returns `201` on creation (also `201` for the idempotent "already existed" case, since the response body is identical either way). |
| GET | `/projects/{projectId}` | `handlers/projects/getProject.js` | required | — | `404 PROJECT_NOT_FOUND` if missing or not owned by the caller. |
| PATCH | `/projects/{projectId}` | `handlers/projects/updateProject.js` | required | Any subset of `{ name, description, defaultBranch, testFramework, memoryIndexingEnabled }` | Same 404 policy as GET. |
| DELETE | `/projects/{projectId}` | `handlers/projects/deleteProject.js` | required | — | `204 No Content` on success. Same 404 policy as GET. |

## Error codes

| Code | HTTP status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing/malformed request field. |
| `UNAUTHENTICATED` | 401 | No valid session cookie. |
| `FORBIDDEN` | 403 | Reserved for future use — not currently returned by the project endpoints (see the 404-vs-403 policy above). |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist, or isn't the caller's. |
| `USER_NOT_FOUND` | 404 | Session refers to a user row that no longer exists. |
| `ROUTE_NOT_FOUND` | 404 | No handler matches the requested method/path. |
| `GITHUB_OAUTH_ERROR` / `GITHUB_API_ERROR` | 502 | GitHub's API/OAuth endpoints returned an error or were unreachable. |
| `INTERNAL_ERROR` | 500 | Unexpected server error — details are logged server-side only. |

## CORS

`backend/src/config/cors.js` sets `Access-Control-Allow-Origin` from
`CORS_ALLOWED_ORIGIN` (default `http://localhost:5173`) plus
`Access-Control-Allow-Credentials: true` (required for the session cookie to
be sent cross-origin). `OPTIONS` requests are answered directly by the
router (`backend/src/index.js` / `backend/src/localServer.js`) with a 204
before reaching any handler.

In a real API Gateway deployment, these values must be mirrored in the
Gateway's own CORS configuration for the `{proxy+}` resource.

## Deployment shape

One Lambda function (`backend/src/index.js`, exporting `handler`) behind a
single API Gateway REST API `{proxy+}` resource with `ANY` method and Lambda
proxy integration. `backend/src/config/routes.js` is the single source of
truth for method+path -> handler mapping, used by both the Lambda
entrypoint and the local dev server (`backend/src/localServer.js`) — so
there is no separate routing config to keep in sync for local development
vs. deployment.
