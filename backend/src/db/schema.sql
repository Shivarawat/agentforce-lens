-- Stores connected Salesforce orgs
CREATE TABLE IF NOT EXISTS orgs (
  id          SERIAL PRIMARY KEY,
  org_id      VARCHAR(20) UNIQUE NOT NULL,   -- Salesforce org ID (18-char)
  org_name    VARCHAR(255),
  instance_url VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type  VARCHAR(50) DEFAULT 'Bearer',
  environment VARCHAR(20) DEFAULT 'production', -- production | sandbox | dev
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stores each agent conversation session
CREATE TABLE IF NOT EXISTS conversations (
  id            SERIAL PRIMARY KEY,
  org_id        VARCHAR(20) NOT NULL REFERENCES orgs(org_id) ON DELETE CASCADE,
  session_id    VARCHAR(255) UNIQUE NOT NULL,
  bot_id        VARCHAR(20),
  bot_name      VARCHAR(255),
  channel       VARCHAR(100),               -- web, mobile, slack, etc.
  status        VARCHAR(50) DEFAULT 'active', -- active | resolved | escalated
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  turn_count    INTEGER DEFAULT 0,
  escalated     BOOLEAN DEFAULT FALSE
);

-- Stores individual steps within a conversation
CREATE TABLE IF NOT EXISTS conversation_turns (
  id              SERIAL PRIMARY KEY,
  session_id      VARCHAR(255) NOT NULL REFERENCES conversations(session_id) ON DELETE CASCADE,
  org_id          VARCHAR(20) NOT NULL,
  turn_index      INTEGER NOT NULL,
  user_message    TEXT,
  bot_response    TEXT,
  topic_name      VARCHAR(255),
  action_name     VARCHAR(255),
  action_success  BOOLEAN,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stores aggregated analytics snapshots (hourly)
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id                  SERIAL PRIMARY KEY,
  org_id              VARCHAR(20) NOT NULL,
  snapshot_hour       TIMESTAMPTZ NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  escalated_count     INTEGER DEFAULT 0,
  resolved_count      INTEGER DEFAULT 0,
  avg_turn_count      NUMERIC(5,2) DEFAULT 0,
  top_actions         JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, snapshot_hour)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(org_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_turns_session_id ON conversation_turns(session_id);
-- One row per turn: lets re-delivered events be ignored with ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS uq_turns_session_turn ON conversation_turns(session_id, turn_index);
CREATE INDEX IF NOT EXISTS idx_snapshots_org_hour ON analytics_snapshots(org_id, snapshot_hour);
