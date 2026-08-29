import { query } from '../pool.js';
import type { Customer } from '../types.js';

/**
 * Find-or-create by (tenant, phone). Idempotent under concurrent webhook
 * deliveries thanks to the unique index and ON CONFLICT.
 */
export async function findOrCreateCustomer(input: {
  tenantId: string;
  phone: string;
  name?: string | null;
  locale?: string;
}): Promise<{ customer: Customer; created: boolean }> {
  const existing = await query<Customer>(
    'SELECT * FROM customers WHERE tenant_id = $1 AND phone = $2',
    [input.tenantId, input.phone],
  );
  if (existing.rows[0]) {
    const current = existing.rows[0];
    // Backfill a name only if WhatsApp gave us one and we had none.
    if (input.name && !current.name) {
      const { rows } = await query<Customer>(
        'UPDATE customers SET name = $2, last_seen_at = now() WHERE id = $1 RETURNING *',
        [current.id, input.name],
      );
      return { customer: rows[0]!, created: false };
    }
    await query('UPDATE customers SET last_seen_at = now() WHERE id = $1', [current.id]);
    return { customer: current, created: false };
  }

  const { rows } = await query<Customer>(
    `INSERT INTO customers (tenant_id, phone, name, locale)
     VALUES ($1, $2, $3, COALESCE($4, 'ar-SA'))
     ON CONFLICT (tenant_id, phone) DO UPDATE SET last_seen_at = now()
     RETURNING *`,
    [input.tenantId, input.phone, input.name ?? null, input.locale ?? null],
  );
  return { customer: rows[0]!, created: true };
}

export async function getCustomerById(tenantId: string, id: string): Promise<Customer | null> {
  const { rows } = await query<Customer>(
    'SELECT * FROM customers WHERE id = $1 AND tenant_id = $2',
    [id, tenantId],
  );
  return rows[0] ?? null;
}

export async function getCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
  const { rows } = await query<Customer>(
    'SELECT * FROM customers WHERE tenant_id = $1 AND phone = $2',
    [tenantId, phone],
  );
  return rows[0] ?? null;
}

export async function updateCustomer(
  tenantId: string,
  id: string,
  patch: { name?: string; email?: string; locale?: string; tags?: string[] },
): Promise<Customer | null> {
  const { rows } = await query<Customer>(
    `UPDATE customers
        SET name   = COALESCE($3, name),
            email  = COALESCE($4, email),
            locale = COALESCE($5, locale),
            tags   = COALESCE($6, tags)
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
    [id, tenantId, patch.name ?? null, patch.email ?? null, patch.locale ?? null, patch.tags ?? null],
  );
  return rows[0] ?? null;
}
