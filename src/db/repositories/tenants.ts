import { query } from '../pool.js';
import type { ChannelAccount, Tenant } from '../types.js';

export async function getTenantById(id: string): Promise<Tenant | null> {
  const { rows } = await query<Tenant>('SELECT * FROM tenants WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { rows } = await query<Tenant>('SELECT * FROM tenants WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}

/**
 * Resolve which tenant an inbound message belongs to, from the channel's own
 * identifier (WhatsApp phone_number_id). This is the multi-tenant entry point:
 * one webhook URL, many companies.
 */
export async function resolveChannelAccount(
  channel: string,
  externalId: string,
): Promise<{ account: ChannelAccount; tenant: Tenant } | null> {
  const { rows } = await query<ChannelAccount & { tenant: Tenant }>(
    `SELECT ca.*, to_jsonb(t.*) AS tenant
       FROM channel_accounts ca
       JOIN tenants t ON t.id = ca.tenant_id
      WHERE ca.channel = $1 AND ca.external_id = $2 AND ca.is_active = TRUE`,
    [channel, externalId],
  );
  const row = rows[0];
  if (!row) return null;
  const { tenant, ...account } = row;
  return { account: account as ChannelAccount, tenant: tenant as Tenant };
}

export async function upsertChannelAccount(input: {
  tenantId: string;
  channel: string;
  externalId: string;
  displayName?: string;
  config?: Record<string, unknown>;
}): Promise<ChannelAccount> {
  const { rows } = await query<ChannelAccount>(
    `INSERT INTO channel_accounts (tenant_id, channel, external_id, display_name, config)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (channel, external_id) DO UPDATE
       SET tenant_id = EXCLUDED.tenant_id,
           display_name = EXCLUDED.display_name,
           config = EXCLUDED.config,
           is_active = TRUE
     RETURNING *`,
    [input.tenantId, input.channel, input.externalId, input.displayName ?? null, JSON.stringify(input.config ?? {})],
  );
  return rows[0]!;
}

export async function createTenant(input: {
  slug: string;
  name: string;
  settings?: Record<string, unknown>;
  timezone?: string;
  locale?: string;
}): Promise<Tenant> {
  const { rows } = await query<Tenant>(
    `INSERT INTO tenants (slug, name, settings, timezone, default_locale)
     VALUES ($1, $2, $3::jsonb, COALESCE($4, 'Asia/Riyadh'), COALESCE($5, 'ar-SA'))
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, settings = EXCLUDED.settings
     RETURNING *`,
    [input.slug, input.name, JSON.stringify(input.settings ?? {}), input.timezone ?? null, input.locale ?? null],
  );
  return rows[0]!;
}
