-- ColorPath v2 Database Schema
-- Run via docker-entrypoint-initdb.d (auto-applied on first container start)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PROBLEMS
-- =============================================
CREATE TABLE IF NOT EXISTS problems (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  formula       TEXT NOT NULL,
  assignment    TEXT NOT NULL,
  difficulty    INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  steps_json    JSONB NOT NULL,
  targets_json  JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SESSIONS (one attempt = one session)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id    TEXT NOT NULL REFERENCES problems(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  total_steps   INT NOT NULL DEFAULT 0,
  route_errors  INT NOT NULL DEFAULT 0,
  mc_errors     INT NOT NULL DEFAULT 0,
  hints_used    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_problem ON sessions(problem_id);

-- =============================================
-- STEP EVENTS (fine-grained interaction log)
-- =============================================
CREATE TABLE IF NOT EXISTS step_events (
  id            BIGSERIAL PRIMARY KEY,
  session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id    TEXT NOT NULL,
  step_index    INT NOT NULL,
  phase         TEXT NOT NULL CHECK (phase IN ('GREEN','VIOLET','YELLOW','BLUE','RED')),
  concept_tag   TEXT NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'route_error','mc_error','mc_correct',
                  'hint_requested','llm_hint_shown'
                )),
  choice_made   TEXT,
  correct       BOOLEAN,
  latency_ms    INT CHECK (latency_ms IS NULL OR latency_ms BETWEEN 0 AND 1800000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_session   ON step_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user      ON step_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_concept   ON step_events(concept_tag, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created   ON step_events(created_at);

-- =============================================
-- STUDENT MASTERY (BKT per user per concept)
-- =============================================
CREATE TABLE IF NOT EXISTS student_mastery (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concept_tag TEXT NOT NULL,
  p_know      FLOAT NOT NULL DEFAULT 0.3  CHECK (p_know BETWEEN 0 AND 1),
  p_learn     FLOAT NOT NULL DEFAULT 0.09 CHECK (p_learn BETWEEN 0 AND 1),
  p_guess     FLOAT NOT NULL DEFAULT 0.2  CHECK (p_guess BETWEEN 0 AND 1),
  p_slip      FLOAT NOT NULL DEFAULT 0.1  CHECK (p_slip BETWEEN 0 AND 1),
  obs_correct INT NOT NULL DEFAULT 0,
  obs_total   INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, concept_tag)
);
CREATE INDEX IF NOT EXISTS idx_mastery_user ON student_mastery(user_id);
