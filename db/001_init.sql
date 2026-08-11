-- Personal Sales Automation System — initial schema
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS leads (
    id                  BIGSERIAL PRIMARY KEY,
    company_name        TEXT NOT NULL,
    contact_name        TEXT,
    phone               TEXT,
    email               TEXT,
    website             TEXT,
    instagram           TEXT,
    business_type       TEXT,
    source              TEXT NOT NULL DEFAULT 'manual',
    score               INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    temperature         TEXT NOT NULL DEFAULT 'COLD'
                         CHECK (temperature IN ('HOT','WARM','COLD','NOT_FIT')),
    status              TEXT NOT NULL DEFAULT 'LEAD'
                         CHECK (status IN (
                             'LEAD','QUALIFIED','CONTACTED','REPLIED','INTERESTED',
                             'DEMO','PROPOSAL','NEGOTIATION','WON','LOST'
                         )),
    needs_human         BOOLEAN NOT NULL DEFAULT FALSE,
    automation_paused   BOOLEAN NOT NULL DEFAULT FALSE,
    last_contacted_at   TIMESTAMPTZ,
    next_followup_at    TIMESTAMPTZ,
    notes               TEXT,
    external_ref        TEXT, -- e.g. placeId from the lead generator, for de-dup
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_leads_external_ref ON leads (external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_leads_status ON leads (status);
CREATE INDEX IF NOT EXISTS ix_leads_temperature ON leads (temperature);
CREATE INDEX IF NOT EXISTS ix_leads_next_followup_at ON leads (next_followup_at);
CREATE INDEX IF NOT EXISTS ix_leads_phone ON leads (phone);
CREATE INDEX IF NOT EXISTS ix_leads_created_at ON leads (created_at);

CREATE TABLE IF NOT EXISTS conversations (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel             TEXT NOT NULL DEFAULT 'whatsapp'
                         CHECK (channel IN ('whatsapp','email','instagram','telegram')),
    external_thread_id  TEXT,
    status              TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_conversations_lead_id ON conversations (lead_id);

CREATE TABLE IF NOT EXISTS messages (
    id                  BIGSERIAL PRIMARY KEY,
    conversation_id     BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    direction           TEXT NOT NULL CHECK (direction IN ('OUTBOUND','INBOUND')),
    channel             TEXT NOT NULL DEFAULT 'whatsapp'
                         CHECK (channel IN ('whatsapp','email','instagram','telegram')),
    body                TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT','FAILED','RECEIVED')),
    classification       TEXT CHECK (classification IN (
                             'INTERESTED','NOT_INTERESTED','QUESTION','PRICE_QUESTION',
                             'PRICE_OBJECTION','TRUST_OBJECTION','NEEDS_MORE_INFORMATION',
                             'READY_FOR_DEMO','READY_TO_BUY','FOLLOW_UP','STOP_CONTACT','UNKNOWN'
                         )),
    recommended_action  TEXT,
    ai_generated        BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at         TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    external_message_id TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_messages_lead_id ON messages (lead_id);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS ix_messages_status ON messages (status);

CREATE TABLE IF NOT EXISTS activities (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    description         TEXT NOT NULL,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_activities_lead_id ON activities (lead_id);
CREATE INDEX IF NOT EXISTS ix_activities_type ON activities (type);

CREATE TABLE IF NOT EXISTS followups (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_step       INTEGER NOT NULL,
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','SENT','CANCELLED','SKIPPED')),
    message_id          BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_followups_due ON followups (status, scheduled_at);
CREATE INDEX IF NOT EXISTS ix_followups_lead_id ON followups (lead_id);

CREATE TABLE IF NOT EXISTS appointments (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    type                TEXT NOT NULL DEFAULT 'DEMO',
    scheduled_at        TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'BOOKED'
                         CHECK (status IN ('BOOKED','COMPLETED','CANCELLED','NO_SHOW')),
    demo_link           TEXT,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_appointments_lead_id ON appointments (lead_id);

CREATE TABLE IF NOT EXISTS proposals (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    amount              NUMERIC(12,2),
    currency            TEXT NOT NULL DEFAULT 'SAR',
    description         TEXT,
    status              TEXT NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT','SENT','ACCEPTED','REJECTED')),
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_proposals_lead_id ON proposals (lead_id);

CREATE TABLE IF NOT EXISTS customers (
    id                  BIGSERIAL PRIMARY KEY,
    lead_id             BIGINT UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
    company_name        TEXT NOT NULL,
    contact_name        TEXT,
    phone               TEXT,
    email               TEXT,
    plan                TEXT,
    monthly_value       NUMERIC(12,2),
    status              TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CHURNED')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
    key                 TEXT PRIMARY KEY,
    value                JSONB NOT NULL,
    description          TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default configurable settings.
INSERT INTO settings (key, value, description) VALUES
    ('scoring_rules', '{
        "ecommerce_business": 20,
        "has_website": 15,
        "has_instagram": 10,
        "high_rating": 10,
        "many_reviews": 15,
        "business_size_signal": 10,
        "no_website_but_active_social": 10,
        "support_volume_signal": 10,
        "thresholds": {"HOT": 80, "WARM": 60, "COLD": 40}
    }'::jsonb, 'Weights (0-100 total) and temperature thresholds used by the Lead Scoring workflow. Edit freely.'),
    ('followup_sequence_days', '[0, 2, 5, 9]'::jsonb, 'Days after initial outreach for follow-up #1, #2 and final follow-up (index 0 = initial outreach day).'),
    ('autonomous_mode', 'false'::jsonb, 'When false, all outbound AI-generated messages require human approval before sending. Set to true only when ready for autonomous sending.'),
    ('pricing_info', '{"summary": "TODO: fill in your AI customer service pricing tiers here for the AI to reference when answering PRICE_QUESTION replies."}'::jsonb, 'Pricing reference used by AI to answer price questions. Edit with your real pricing.'),
    ('demo_booking_url', '""'::jsonb, 'Link sent to leads once they are ready for a demo. Falls back to DEMO_BOOKING_URL env var if empty.'),
    ('notification_channel', '{"telegram_chat_id": "", "notify_email": "ornas7374@gmail.com"}'::jsonb, 'Where human-handoff / demo-booked / analytics notifications are sent.')
ON CONFLICT (key) DO NOTHING;
