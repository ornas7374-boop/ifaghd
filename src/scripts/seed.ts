/**
 * Seed loader.
 *
 *   npm run seed                 -> knowledge base + demo tenant/products/orders
 *   npm run seed -- --kb-only    -> knowledge base only (safe to re-run in prod
 *                                   after editing db/seeds/knowledge-base.ar.json)
 *
 * Everything here is idempotent: re-running updates rather than duplicating.
 * The demo tenant is sample data for local testing — replace it with your own
 * store's data (or sync from your commerce system) before going live.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, transaction, closePool } from '../db/pool.js';
import { runMigrations } from '../db/migrate.js';
import { logger } from '../observability/logger.js';
import type { KbCategory } from '../db/types.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(HERE, '../../db/seeds');
const log = logger();

interface KbSeed {
  entries: Array<{
    category: KbCategory;
    title: string;
    question?: string;
    answer: string;
    keywords?: string[];
    priority?: number;
  }>;
}

interface DemoSeed {
  tenant: { slug: string; name: string; timezone?: string; locale?: string; settings?: Record<string, unknown> };
  channel_accounts: Array<{ channel: string; external_id: string; display_name?: string; config?: Record<string, unknown> }>;
  products: Array<{
    sku: string; name: string; name_en?: string; category?: string; brand?: string;
    price: number; sale_price?: number | null; stock_quantity: number; description?: string;
  }>;
  customers: Array<{ phone: string; name?: string; email?: string | null; external_ref?: string }>;
  orders: Array<{
    order_number: string; customer_phone: string; status: string; payment_status: string;
    payment_method?: string; total_amount: number; shipping_company?: string | null;
    tracking_number?: string | null; tracking_url?: string | null;
    shipping_address?: Record<string, unknown>; estimated_delivery_in_days?: number;
    placed_days_ago?: number; delivered_days_ago?: number;
    items: Array<{ sku: string; name: string; quantity: number; unit_price: number }>;
  }>;
}

async function main(): Promise<void> {
  const kbOnly = process.argv.includes('--kb-only');
  const tenantSlugArg = argValue('--tenant');

  const migration = await runMigrations();
  if (migration.applied.length) log.info({ applied: migration.applied }, 'applied pending migrations first');

  const demo = JSON.parse(await readFile(path.join(SEEDS_DIR, 'demo-tenant.json'), 'utf8')) as DemoSeed;
  const targetSlug = tenantSlugArg ?? demo.tenant.slug;

  // ---- Tenant ------------------------------------------------------------
  const tenantId = await upsertTenant(
    kbOnly ? { slug: targetSlug, name: targetSlug } : demo.tenant,
    Boolean(tenantSlugArg) || kbOnly,
  );

  // ---- Knowledge base ----------------------------------------------------
  const kb = JSON.parse(await readFile(path.join(SEEDS_DIR, 'knowledge-base.ar.json'), 'utf8')) as KbSeed;
  const kbCount = await seedKnowledgeBase(tenantId, kb);
  log.info({ entries: kbCount, tenant: targetSlug }, 'knowledge base seeded');

  if (kbOnly) {
    log.info('--kb-only: skipping demo tenant data');
    return;
  }

  await seedChannelAccounts(tenantId, demo);
  const productIds = await seedProducts(tenantId, demo);
  const customerIds = await seedCustomers(tenantId, demo);
  await seedOrders(tenantId, demo, customerIds, productIds);

  log.info(
    {
      tenant_id: tenantId,
      channel_accounts: demo.channel_accounts.length,
      products: demo.products.length,
      customers: demo.customers.length,
      orders: demo.orders.length,
    },
    'demo data seeded',
  );

  const account = demo.channel_accounts[0];
  log.info(
    `Next: point your WhatsApp phone_number_id at this tenant. Current mapping: ` +
      `${account?.channel}/${account?.external_id} -> ${demo.tenant.slug}`,
  );
}

async function upsertTenant(
  tenant: { slug: string; name: string; timezone?: string; locale?: string; settings?: Record<string, unknown> },
  keepExistingSettings: boolean,
): Promise<string> {
  const existing = await query<{ id: string }>('SELECT id FROM tenants WHERE slug = $1', [tenant.slug]);
  if (existing.rows[0]) {
    if (!keepExistingSettings && tenant.settings) {
      await query('UPDATE tenants SET name = $2, settings = $3::jsonb WHERE id = $1', [
        existing.rows[0].id, tenant.name, JSON.stringify(tenant.settings),
      ]);
    }
    return existing.rows[0].id;
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO tenants (slug, name, timezone, default_locale, settings)
     VALUES ($1, $2, COALESCE($3,'Asia/Riyadh'), COALESCE($4,'ar-SA'), $5::jsonb) RETURNING id`,
    [tenant.slug, tenant.name, tenant.timezone ?? null, tenant.locale ?? null, JSON.stringify(tenant.settings ?? {})],
  );
  return rows[0]!.id;
}

/** Matched on (tenant, title) so editing an answer updates in place. */
async function seedKnowledgeBase(tenantId: string, kb: KbSeed): Promise<number> {
  return transaction(async (client) => {
    let count = 0;
    for (const entry of kb.entries) {
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM knowledge_base WHERE tenant_id = $1 AND title = $2',
        [tenantId, entry.title],
      );
      if (existing.rows[0]) {
        await client.query(
          `UPDATE knowledge_base
              SET category = $2, question = $3, answer = $4, keywords = $5,
                  priority = COALESCE($6, priority), is_active = TRUE, created_by = 'seed'
            WHERE id = $1`,
          [existing.rows[0].id, entry.category, entry.question ?? null, entry.answer, entry.keywords ?? [], entry.priority ?? null],
        );
      } else {
        await client.query(
          `INSERT INTO knowledge_base (tenant_id, category, title, question, answer, keywords, priority, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0),'seed')`,
          [tenantId, entry.category, entry.title, entry.question ?? null, entry.answer, entry.keywords ?? [], entry.priority ?? null],
        );
      }
      count++;
    }
    return count;
  });
}

async function seedChannelAccounts(tenantId: string, demo: DemoSeed): Promise<void> {
  for (const account of demo.channel_accounts) {
    await query(
      `INSERT INTO channel_accounts (tenant_id, channel, external_id, display_name, config)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       ON CONFLICT (channel, external_id)
       DO UPDATE SET tenant_id = EXCLUDED.tenant_id, display_name = EXCLUDED.display_name, is_active = TRUE`,
      [tenantId, account.channel, account.external_id, account.display_name ?? null, JSON.stringify(account.config ?? {})],
    );
  }
}

async function seedProducts(tenantId: string, demo: DemoSeed): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const p of demo.products) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO products (tenant_id, sku, name, name_en, category, brand, price, sale_price, stock_quantity, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (tenant_id, sku) DO UPDATE
         SET name = EXCLUDED.name, name_en = EXCLUDED.name_en, category = EXCLUDED.category,
             brand = EXCLUDED.brand, price = EXCLUDED.price, sale_price = EXCLUDED.sale_price,
             stock_quantity = EXCLUDED.stock_quantity, description = EXCLUDED.description, is_active = TRUE
       RETURNING id`,
      [
        tenantId, p.sku, p.name, p.name_en ?? null, p.category ?? null, p.brand ?? null,
        p.price, p.sale_price ?? null, p.stock_quantity, p.description ?? null,
      ],
    );
    ids.set(p.sku, rows[0]!.id);
  }
  return ids;
}

async function seedCustomers(tenantId: string, demo: DemoSeed): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const c of demo.customers) {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO customers (tenant_id, phone, name, email, external_ref)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id, phone) DO UPDATE
         SET name = EXCLUDED.name, email = EXCLUDED.email, external_ref = EXCLUDED.external_ref
       RETURNING id`,
      [tenantId, c.phone, c.name ?? null, c.email ?? null, c.external_ref ?? null],
    );
    ids.set(c.phone, rows[0]!.id);
  }
  return ids;
}

async function seedOrders(
  tenantId: string,
  demo: DemoSeed,
  customerIds: Map<string, string>,
  productIds: Map<string, string>,
): Promise<void> {
  for (const o of demo.orders) {
    const customerId = customerIds.get(o.customer_phone);
    if (!customerId) {
      log.warn({ order: o.order_number, phone: o.customer_phone }, 'skipping order: customer not in seed');
      continue;
    }

    const placedAt = daysAgo(o.placed_days_ago ?? 0);
    const deliveredAt = o.delivered_days_ago === undefined ? null : daysAgo(o.delivered_days_ago);
    const estimated =
      o.estimated_delivery_in_days === undefined ? null : daysFromNow(o.estimated_delivery_in_days).toISOString().slice(0, 10);

    await transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO orders (
           tenant_id, customer_id, order_number, status, payment_status, payment_method,
           total_amount, shipping_company, tracking_number, tracking_url, shipping_address,
           estimated_delivery, placed_at, delivered_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14)
         ON CONFLICT (tenant_id, order_number) DO UPDATE
           SET status = EXCLUDED.status, payment_status = EXCLUDED.payment_status,
               total_amount = EXCLUDED.total_amount, shipping_company = EXCLUDED.shipping_company,
               tracking_number = EXCLUDED.tracking_number, tracking_url = EXCLUDED.tracking_url,
               estimated_delivery = EXCLUDED.estimated_delivery, delivered_at = EXCLUDED.delivered_at
         RETURNING id`,
        [
          tenantId, customerId, o.order_number, o.status, o.payment_status, o.payment_method ?? null,
          o.total_amount, o.shipping_company ?? null, o.tracking_number ?? null, o.tracking_url ?? null,
          JSON.stringify(o.shipping_address ?? {}), estimated, placedAt, deliveredAt,
        ],
      );
      const orderId = rows[0]!.id;

      // Rewrite items so an edited seed file is reflected exactly.
      await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      for (const item of o.items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [orderId, productIds.get(item.sku) ?? null, item.sku, item.name, item.quantity, item.unit_price],
        );
      }
    });
  }
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

try {
  await main();
} catch (err) {
  log.error({ err }, 'seed failed');
  process.exitCode = 1;
} finally {
  await closePool();
}
