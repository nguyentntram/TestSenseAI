# REST API Contracts — All Features (Team, Week 1)

Base URL: `https://api.testsense.internal/v1` (API Gateway — set up in Week 2)

All endpoints require `Authorization: Bearer <session-token>` unless noted.
All request/response bodies are `application/json`.

---

## Tram — Projects & GitHub Connection

### `GET /auth/github`
Redirect the user to GitHub OAuth. No auth required.

**Response:** 302 redirect to `https://github.com/login/oauth/authorize?...`

---

### `GET /auth/github/callback?code=&state=`
GitHub OAuth callback. No auth required.

**Response:** 302 redirect to `/projects?userId=<uuid>` on success.

---

### `GET /projects`
List all projects for the authenticated user.

**Response 200:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Payment Service",
      "repositoryFullName": "acme-corp/payment-service",
      "defaultBranch": "main",
      "language": "TypeScript",
      "testFramework": "Jest",
      "syncStatus": "synced",
      "lastSyncedAt": "2026-07-18T13:05:00Z",
      "createdAt": "2026-07-16T10:00:00Z"
    }
  ]
}
```

---

### `POST /projects`
Connect a new repository.

**Request:**
```json
{
  "repositoryFullName": "acme-corp/payment-service",
  "name": "Payment Service",
  "defaultBranch": "main",
  "language": "TypeScript",
  "testFramework": "Jest"
}
```

**Response 201:**
```json
{ "projectId": "uuid", "name": "Payment Service", "repositoryFullName": "acme-corp/payment-service" }
```

**Response 409:** Repository already connected.
**Response 404:** Repository not found or not accessible with the user's token.

---

### `GET /projects/:projectId`

**Response 200:**
```json
{
  "project": { ...same shape as list item, plus "description": "..." }
}
```

**Response 404:** Not found. **Response 403:** Belongs to another user.

---

### `DELETE /projects/:projectId`

**Response 204:** No content.

---

## Han — PR Ingestion & Analysis

### `GET /projects/:projectId/pull-requests`
List all PRs for a project.

**Query params:** `status=open|merged|closed` (optional filter)

**Response 200:**
```json
{
  "pullRequests": [
    {
      "id": "uuid",
      "number": 482,
      "title": "Add support for partial refunds",
      "author": "jchen",
      "status": "open",
      "headBranch": "feature/partial-refunds",
      "baseBranch": "main",
      "additions": 124,
      "deletions": 38,
      "commitsCount": 5,
      "webhookStatus": "analyzed",
      "createdAt": "2026-07-15T11:00:00Z",
      "updatedAt": "2026-07-17T09:30:00Z"
    }
  ]
}
```

---

### `GET /projects/:projectId/pull-requests/:prId`
Get a single PR with changed files.

**Response 200:**
```json
{
  "pullRequest": {
    ...same as list item,
    "description": "...",
    "changedFiles": [
      { "path": "src/payments/refundService.ts", "status": "modified", "additions": 67, "deletions": 12 }
    ]
  }
}
```

---

### `POST /webhooks/github`
GitHub webhook receiver. No user auth — verified via HMAC-SHA256.

**Headers required:** `X-Hub-Signature-256`, `X-GitHub-Event`

**Response 200:**
```json
{ "message": "Webhook processed", "prId": "uuid", "action": "opened" }
```

**Response 401:** Invalid signature.

---

## Trung — Memory & Retrieval

### `POST /projects/:projectId/memory/ingest`
Trigger historical test ingestion for a project. Runs async.

**Response 202:**
```json
{ "message": "Ingestion started", "projectId": "uuid" }
```

---

### `POST /projects/:projectId/memory/search`
Find similar historical examples for a given query.

**Request:**
```json
{ "queryText": "<PR diff or description>", "topK": 5, "minSimilarity": 0.5 }
```

**Response 200:**
```json
{
  "results": [
    {
      "id": "uuid",
      "sourceRef": "PR-402",
      "testCode": "...",
      "similarity": 0.91,
      "metadata": { "prNumber": 402, "prTitle": "...", "mergedAt": "..." }
    }
  ]
}
```

---

### `GET /projects/:projectId/analytics`
Get memory metrics and recent retrieval stats.

**Response 200:**
```json
{
  "memoryCount": 128,
  "retrievalHits": 847,
  "avgSimilarity": 0.74,
  "acceptanceRate": 0.81
}
```

---

## Anh — Test Generation & Feedback

### `GET /projects/:projectId/generated-tests`
List all generated tests for a project.

**Query params:** `status=draft|ready|rejected` (optional)

**Response 200:**
```json
{
  "tests": [
    {
      "id": "uuid",
      "title": "refundService.test.ts — partial refund does not exceed charge",
      "status": "ready",
      "pullRequestId": "uuid",
      "generatedAt": "2026-07-17T09:45:00Z"
    }
  ]
}
```

---

### `GET /projects/:projectId/generated-tests/:testId`
Get a single test with full code and reasoning.

**Response 200:**
```json
{
  "test": {
    "id": "uuid",
    "title": "...",
    "testCode": "...",
    "reasoning": "...",
    "status": "ready",
    "pullRequestId": "uuid",
    "generatedAt": "2026-07-17T09:45:00Z"
  }
}
```

---

### `POST /projects/:projectId/generated-tests/:testId/feedback`
Accept, modify, or reject a generated test.

**Request:**
```json
{ "action": "accept" }
```
or
```json
{ "action": "modify", "editedCode": "..." }
```
or
```json
{ "action": "reject" }
```

**Response 200:**
```json
{ "feedbackId": "uuid", "testId": "uuid", "action": "accept" }
```

**Response 400:** Invalid action or missing editedCode for modify.
