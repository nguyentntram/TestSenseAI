-- Migration 001: users table
-- Owned by Tram (Projects & GitHub Connection)

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id  BIGINT NOT NULL UNIQUE,
  login      TEXT NOT NULL,
  email      TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
