# CLAUDE.md — deployment & operations guide

Instructions for Claude (or any AI assistant) working in this repo, especially around deploying or running the backend against real AWS. Read this before touching `backend/template.sam.yaml` or running `sam deploy`.

## Prerequisites

- AWS SAM CLI (`pip install aws-sam-cli` if not present — no `aws`/`sam` CLI is assumed pre-installed).
- Real AWS credentials with permissions for: CloudFormation, Lambda, IAM, API Gateway, Step Functions, S3, CloudFront, Secrets Manager, Bedrock.
- **Region is `us-west-2` everywhere** — the CockroachDB cluster, Bedrock model access, and all Secrets Manager secrets live there. Deploying to any other region will fail in confusing ways (resources silently not found).

## One-time setup: Secrets Manager

Before the first deploy, these secrets must exist under `testsense-ai/dev/` (or whatever `SecretsPrefix` you use) in **us-west-2**:

| Secret name suffix | Value |
|---|---|
| `database-url` | CockroachDB connection string |
| `github-client-secret` | GitHub App client secret |
| `oauth-state-secret` | Random string, signs OAuth CSRF state |
| `session-secret` | Random string, signs the session cookie |
| `webhook-secret` | Must match the GitHub App's actual webhook secret exactly |

These are plain Secrets Manager secrets (`SecretString`), not JSON — create with `PutSecretValueCommand`/`CreateSecretCommand` via the AWS SDK, or `aws secretsmanager create-secret` if the `aws` CLI is available.

## GitHub App (not a classic OAuth App)

This project uses a **GitHub App** for both sign-in and webhook delivery — not a classic OAuth App. Sign-in reuses the standard user-to-server OAuth flow (same `client_id`/`client_secret` mechanism), but webhooks are configured once at the App level, not per-repository.

- App settings: `https://github.com/settings/apps/<app-slug>`
- Two fields must be kept in sync with the current deployment (**no API exists to update these — web UI only**):
  - **Webhook URL** → the deployed `WebhookUrl` stack output
  - **Redirect URI** (under "Identifying and authorizing users") → the deployed `ApiUrl` + `/auth/github/callback`
- Any repo the App is installed on automatically sends `pull_request` events to the one configured webhook URL — no per-repo setup needed. Installing is one click, done by whoever owns the target repo (`https://github.com/apps/<app-slug>/installations/new`).

## Deploying

```bash
cd backend
sam build --template template.sam.yaml
sam deploy \
  --stack-name testsense-ai-dev \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region us-west-2 \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides "GithubClientId=<client_id> GithubCallbackUrl=<ApiUrl>/auth/github/callback FrontendOrigin=<CloudFront URL>"
```

`GithubCallbackUrl` and `FrontendOrigin` have chicken-and-egg placeholder defaults (`localhost`) — the first deploy will use those, then re-run with the real values once the stack outputs (`ApiUrl`, `FrontendUrl`) are known. Get outputs any time with:

```bash
aws cloudformation describe-stacks --stack-name testsense-ai-dev --region us-west-2 --query 'Stacks[0].Outputs'
```

**If `sam deploy` fails, check the stack status before retrying** — a `CREATE_FAILED` leaves the stack in `ROLLBACK_COMPLETE`, which cannot be updated. Delete it first (`sam delete --stack-name testsense-ai-dev --region us-west-2 --no-prompts`), then redeploy.

## Deploying the frontend

The frontend is **not** part of the SAM build — it's a separate static build synced to the `FrontendBucketName` S3 bucket:

```bash
# from repo root
VITE_API_MODE=real VITE_API_BASE_URL=<ApiUrl> npm run build
aws s3 sync dist/ s3://<FrontendBucketName> --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

(If the `aws` CLI isn't available, use `@aws-sdk/client-s3`'s `PutObjectCommand` per file and `@aws-sdk/client-cloudfront`'s `CreateInvalidationCommand` instead — same effect.)

**Redeploy the frontend after any change to `src/`** — it is not automatically rebuilt by the backend deploy.

## Known limitations (not bugs, don't try to "fix" without discussing first)

- **Sign-in doesn't persist in Incognito/InPrivate browser windows.** Frontend (CloudFront) and backend (API Gateway) are on different domains — a genuinely cross-site cookie setup. `SameSite=None; Secure` (already set) works in normal browsing but private-browsing modes increasingly block third-party cookies regardless of `SameSite`. A real fix needs a shared parent domain (e.g. `app.example.com` + `api.example.com`) so the cookie becomes same-site. Test/demo in a normal browser window.
- **`ingest-history` (historical PR backfill) isn't triggered automatically** when a repo is connected — it must be invoked manually (`aws lambda invoke` or via the AWS console) with `{"projectId": "..."}`. This is why a freshly-connected project's Memory tab and vector search start empty.

## Before changing `backend/template.sam.yaml`

A few non-obvious things that have already cost real debugging time — don't reintroduce them:

- Every Lambda's `CodeUri` must be `./` (the whole `backend/` dir), with a full-path `Handler` (e.g. `lambdas/webhook-handler/index.handler`) — **not** a narrower `CodeUri` like `lambdas/webhook-handler/`. The handlers import from `shared/` and (for some) `src/services/secrets/`, which live outside any narrower CodeUri and would be missing from the deployed zip.
- Step Functions state machines must use `AWS::Serverless::StateMachine` (SAM), not the raw `AWS::StepFunctions::StateMachine` — only the SAM resource type supports `DefinitionUri` pointing at an external ASL file.
- Never build a Secrets Manager ARN by hand (`!Sub 'arn:...:secret:${prefix}/name'`) — AWS appends a random suffix to the real ARN that a hand-built string won't have. Use the plain secret name as `SecretId` instead; the SDK accepts either.
- `us.anthropic.claude-sonnet-4-6` is a cross-region **inference profile**, not a plain foundation model — it needs an IAM `Resource` entry under `arn:aws:bedrock:<region>:<account>:inference-profile/...`, separate from the `foundation-model/*` ARN pattern Titan uses.
- Don't add an API Gateway `Cors:` property to `AWS::Serverless::Api` if the Lambda already handles `OPTIONS` itself (this app's `src/index.js` does, via `buildCorsHeaders()`). The two fight, and API Gateway's auto-generated CORS mock integration has been observed to silently keep serving a stale origin across multiple redeploys even after the underlying resource definition updated correctly — very hard to debug. Let the Lambda own it.
- A user's GitHub OAuth token is stored at `users.oauth_secret_reference` (set at sign-in) — always fetch it through that column, never reconstruct a Secrets Manager path from `projectId`/`userId` by guessing a naming convention. Two different Lambdas guessed two different (wrong) conventions before this was caught.
