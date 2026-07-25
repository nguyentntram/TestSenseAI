-- Users table.
--
-- One row per person who has signed in with GitHub. The raw GitHub OAuth
-- token is never stored here — only `oauth_secret_reference`, an opaque
-- pointer to the real token in AWS Secrets Manager (see
-- backend/src/services/secrets/ and docs/DATABASE.md).
--
-- Target: CockroachDB (PostgreSQL wire-compatible). gen_random_uuid() is
-- built in on CockroachDB and on PostgreSQL 13+.

CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_user_id          BIGINT NOT NULL,
    github_username         STRING NOT NULL,
    github_email            STRING,
    avatar_url              STRING,
    oauth_secret_reference  STRING NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_github_user_id_unique UNIQUE (github_user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_github_username ON users (github_username);
