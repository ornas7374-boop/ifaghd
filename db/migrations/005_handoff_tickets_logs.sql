-- =====================================================================
-- 005_handoff_tickets_logs.sql
-- Escalation to humans, support tickets, and the agent audit trail.
-- =====================================================================

CREATE TABLE IF NOT EXISTS human_handoffs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reason_code         TEXT NOT NULL
                        CHECK (reason_code IN ('customer_request', 'angry_customer',
                                               'sensitive_issue', 'low_confidence',
                                               'tool_failure', 'missing_information',
                                               'repeated_failure', 'policy_violation',
                                               'manual')),
  reason_detail       TEXT,
  priority            TEXT NOT NULL DEFAULT 'normal'
                        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'notified', 'claimed', 'resolved', 'cancelled')),
  -- Snapshot taken at escalation time so the agent has full context
  -- even after the conversation moves on.
  conversation_summary TEXT,
  last_customer_message TEXT,
  customer_snapshot   JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_to         TEXT,
  notified_at         TIMESTAMPTZ,
  notification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (notification_status IN ('pending', 'sent', 'failed', 'skipped')),
  notification_error  TEXT,
  claimed_at          TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  resolution_note     TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_handoffs_tenant_status ON human_handoffs(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_handoffs_conversation ON human_handoffs(conversation_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  ticket_number   TEXT NOT NULL,
  category        TEXT NOT NULL
                    CHECK (category IN ('order_issue', 'return_request', 'exchange_request',
                                        'complaint', 'product_question', 'shipping_issue',
                                        'payment_issue', 'other')),
  subject         TEXT NOT NULL,
  description     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  created_by      TEXT NOT NULL DEFAULT 'agent',
  assigned_to     TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  UNIQUE (tenant_id, ticket_number)
);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON support_tickets(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON support_tickets(customer_id);

-- Monotonic per-tenant ticket counter (avoids races on max()+1).
CREATE TABLE IF NOT EXISTS ticket_counters (
  tenant_id   UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_value  BIGINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- agent_logs: every step the agent took. This is the observability spine
-- and the evidence trail when a customer disputes what the bot said.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
  trace_id        TEXT NOT NULL,
  step            TEXT NOT NULL,          -- e.g. 'intent.classify', 'tool.get_order', 'llm.generate'
  level           TEXT NOT NULL DEFAULT 'info'
                    CHECK (level IN ('debug', 'info', 'warn', 'error')),
  status          TEXT NOT NULL DEFAULT 'ok'
                    CHECK (status IN ('ok', 'error', 'skipped', 'blocked', 'retry')),
  detail          JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message   TEXT,
  duration_ms     INTEGER,
  model           TEXT,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  cost_usd        NUMERIC(12,6),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_trace ON agent_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation ON agent_logs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_tenant_time ON agent_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_errors ON agent_logs(tenant_id, created_at DESC) WHERE status = 'error';

-- Sliding-window rate limiting per customer (cheap, no Redis dependency).
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  bucket_key    TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_counters(window_start);
