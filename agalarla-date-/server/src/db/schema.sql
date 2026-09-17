-- Agalarla Date — Sprint 1 backend schema (Kisi 2)
-- Durable source of truth in PostgreSQL. Redis is used elsewhere for
-- ephemeral queue presence / rate limits and is not modelled here.
--
-- Apply with:  psql "$DATABASE_URL" -f server/src/db/schema.sql
-- This file is idempotent (safe to re-run).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Accounts ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (lower(email));

-- Profiles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  birth_date   DATE NOT NULL,
  bio          TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Matching preferences ----------------------------------------------------
CREATE TABLE IF NOT EXISTS preferences (
  user_id    UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  min_age    INTEGER NOT NULL DEFAULT 18 CHECK (min_age >= 18),
  max_age    INTEGER NOT NULL DEFAULT 99 CHECK (max_age >= min_age),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blocks (directional). A block hides both directions from candidate pools.
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocked_idx ON blocks (blocked_id);

-- Matching queue ----------------------------------------------------------
-- status: queued | matched | left
CREATE TABLE IF NOT EXISTS queue_entries (
  user_id         UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  idempotency_key UUID,
  status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'matched', 'left'))
);

-- Guarantees that a replayed Idempotency-Key returns the original result
-- instead of creating a second queue entry for the same user.
CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_idempotency_idx
  ON queue_entries (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS queue_entries_status_idx
  ON queue_entries (status);
