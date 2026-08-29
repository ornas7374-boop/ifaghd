-- =====================================================================
-- 002_conversations_and_messages.sql
-- Conversation state, message log, and rolling summaries (agent memory).
-- =====================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel               TEXT NOT NULL,
  channel_account_id    UUID REFERENCES channel_accounts(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'handed_off', 'resolved', 'closed')),
  -- When a human takes over, the agent stops replying on this conversation.
  handled_by            TEXT NOT NULL DEFAULT 'agent'
                          CHECK (handled_by IN ('agent', 'human')),
  assigned_agent_id     TEXT,
  last_intent           TEXT,
  -- Rolling summary so we never ship the whole history to the LLM.
  summary               TEXT,
  summary_message_count INTEGER NOT NULL DEFAULT 0,
  message_count         INTEGER NOT NULL DEFAULT 0,
  sentiment             TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'angry')),
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON conversations(tenant_id, status);
-- At most one open conversation per customer per channel.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_open_per_customer
  ON conversations(customer_id, channel)
  WHERE status IN ('open', 'handed_off');

CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  role                TEXT NOT NULL CHECK (role IN ('customer', 'agent', 'human', 'system')),
  content             TEXT NOT NULL,
  content_type        TEXT NOT NULL DEFAULT 'text'
                        CHECK (content_type IN ('text', 'image', 'audio', 'document', 'video', 'location', 'interactive', 'unsupported')),
  -- Provider message id, used for idempotency and delivery receipts.
  channel_message_id  TEXT,
  intent              TEXT,
  -- Which tools the agent used to produce this message (audit / grounding).
  tool_calls          JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_in           INTEGER,
  tokens_out          INTEGER,
  latency_ms          INTEGER,
  model               TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_time ON messages(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_messages_channel_id
  ON messages(tenant_id, channel_message_id)
  WHERE channel_message_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- webhook_events: raw inbound payloads + dedup key. Meta retries webhooks,
-- so this is what stops a customer being answered twice.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL,
  external_event_id   TEXT NOT NULL,
  payload             JSONB NOT NULL,
  status              TEXT NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processing', 'processed', 'failed', 'skipped')),
  error               TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at        TIMESTAMPTZ,
  UNIQUE (channel, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status, received_at DESC);
