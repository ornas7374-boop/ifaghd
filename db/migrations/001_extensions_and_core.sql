-- =====================================================================
-- 001_extensions_and_core.sql
-- Core multi-tenant foundation: tenants, channel accounts, customers.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy text search for KB/products

-- ---------------------------------------------------------------------
-- tenants: one row per company using the platform (multi-tenant SaaS).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'trial')),
  default_locale      TEXT NOT NULL DEFAULT 'ar-SA',
  timezone            TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  -- Per-tenant agent behaviour. Editable without touching agent code.
  settings            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- channel_accounts: maps an inbound channel identity (e.g. a WhatsApp
-- phone_number_id) to a tenant. This is how a single webhook endpoint
-- serves many companies.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'webchat', 'instagram', 'sms')),
  -- Provider-side identifier: WhatsApp phone_number_id, Telegram bot id, ...
  external_id         TEXT NOT NULL,
  display_name        TEXT,
  -- Channel credentials/config. Secrets belong in the vault/env; this holds
  -- non-secret config plus optional encrypted refs.
  config              JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_tenant ON channel_accounts(tenant_id);

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- E.164 without '+', as WhatsApp delivers it (e.g. 966500000001)
  phone               TEXT NOT NULL,
  name                TEXT,
  email               TEXT,
  locale              TEXT NOT NULL DEFAULT 'ar-SA',
  external_ref        TEXT,               -- id in the merchant's own system
  tags                TEXT[] NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_blocked          BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_customers_external_ref ON customers(tenant_id, external_ref);
