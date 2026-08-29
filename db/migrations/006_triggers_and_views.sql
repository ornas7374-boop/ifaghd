-- =====================================================================
-- 006_triggers_and_views.sql
-- updated_at maintenance, counters, and operator-facing views.
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants','channel_accounts','customers','conversations','products',
    'orders','knowledge_base','human_handoffs','support_tickets'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
  END LOOP;
END $$;

-- Keep conversations.message_count / last_message_at in sync with inserts.
CREATE OR REPLACE FUNCTION bump_conversation_on_message() RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
     SET message_count   = message_count + 1,
         last_message_at = NEW.sent_at,
         updated_at      = now()
   WHERE id = NEW.conversation_id;

  UPDATE customers
     SET last_seen_at = GREATEST(last_seen_at, NEW.sent_at)
   WHERE id = NEW.customer_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_bump_conversation ON messages;
CREATE TRIGGER trg_messages_bump_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION bump_conversation_on_message();

-- Snapshot KB rows into the revision log on every edit.
CREATE OR REPLACE FUNCTION snapshot_kb_revision() RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.title, OLD.question, OLD.answer, OLD.keywords, OLD.category, OLD.is_active)
     IS DISTINCT FROM
     (NEW.title, NEW.question, NEW.answer, NEW.keywords, NEW.category, NEW.is_active)
  THEN
    INSERT INTO knowledge_base_revisions (kb_id, version, snapshot, changed_by)
    VALUES (OLD.id, OLD.version, to_jsonb(OLD) - 'search_vector', NEW.created_by);
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_kb_revision ON knowledge_base;
CREATE TRIGGER trg_kb_revision
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION snapshot_kb_revision();

-- Race-free per-tenant ticket numbers: TCK-000123
CREATE OR REPLACE FUNCTION next_ticket_number(p_tenant_id UUID) RETURNS TEXT AS $$
DECLARE v BIGINT;
BEGIN
  INSERT INTO ticket_counters (tenant_id, last_value)
  VALUES (p_tenant_id, 1)
  ON CONFLICT (tenant_id) DO UPDATE SET last_value = ticket_counters.last_value + 1
  RETURNING last_value INTO v;
  RETURN 'TCK-' || lpad(v::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Operator dashboard: escalations waiting for a human.
CREATE OR REPLACE VIEW v_pending_handoffs AS
SELECT h.id, h.tenant_id, t.name AS tenant_name, h.priority, h.reason_code,
       h.reason_detail, h.conversation_summary, h.last_customer_message,
       c.name AS customer_name, c.phone AS customer_phone,
       h.status, h.notification_status, h.created_at
  FROM human_handoffs h
  JOIN customers c ON c.id = h.customer_id
  JOIN tenants  t ON t.id = h.tenant_id
 WHERE h.status IN ('pending', 'notified')
 ORDER BY CASE h.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
                          WHEN 'normal' THEN 2 ELSE 3 END,
          h.created_at;

-- Daily health/cost rollup per tenant.
CREATE OR REPLACE VIEW v_agent_daily_stats AS
SELECT tenant_id,
       date_trunc('day', created_at) AS day,
       count(*) FILTER (WHERE step = 'pipeline.complete')          AS messages_handled,
       count(*) FILTER (WHERE status = 'error')                    AS errors,
       count(*) FILTER (WHERE step = 'handoff.created')            AS handoffs,
       count(*) FILTER (WHERE step = 'guardrail.blocked')          AS guardrail_blocks,
       coalesce(sum(tokens_in), 0)                                 AS tokens_in,
       coalesce(sum(tokens_out), 0)                                AS tokens_out,
       coalesce(sum(cost_usd), 0)                                  AS cost_usd
  FROM agent_logs
 GROUP BY tenant_id, date_trunc('day', created_at);
