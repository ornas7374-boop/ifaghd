import { randomUUID } from 'node:crypto';

// Point every test at the dedicated test database before any module reads env.
process.env.NODE_ENV = 'test';
// Point at a dedicated test database. Override with TEST_DATABASE_URL — the
// default carries no password so no credential is ever committed here.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://ifaghd@localhost:5432/ifaghd_test';
process.env.LLM_PROVIDER = 'mock';
process.env.LLM_MODEL = 'mock-1';
process.env.INTERNAL_API_KEY = 'test-internal-api-key-0123456789';
process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
process.env.WHATSAPP_APP_SECRET = 'test-app-secret';
process.env.WHATSAPP_REQUIRE_SIGNATURE = 'false';
process.env.HANDOFF_NOTIFY_CHANNEL = 'none';
process.env.LOG_LEVEL = 'silent';

const { query, closePool } = await import('../../src/db/pool.js');
const { runMigrations } = await import('../../src/db/migrate.js');

export { query, closePool };

let migrated = false;

export async function ensureSchema(): Promise<void> {
  if (migrated) return;
  await runMigrations();
  migrated = true;
}

/** Wipe all tenant-scoped data between tests. */
export async function truncateAll(): Promise<void> {
  await query(`
    TRUNCATE TABLE
      agent_logs, webhook_events, knowledge_base_revisions, knowledge_base,
      support_tickets, ticket_counters, human_handoffs, messages, conversations,
      order_items, orders, products, customers, channel_accounts, tenants,
      rate_limit_counters
    RESTART IDENTITY CASCADE
  `);
}

export interface TestFixture {
  tenantId: string;
  channelAccountExternalId: string;
  customerId: string;
  customerPhone: string;
  otherCustomerId: string;
  otherCustomerPhone: string;
  orderNumber: string;
  otherOrderNumber: string;
  productSku: string;
}

/**
 * Builds a small but complete tenant: two customers with one order each, a
 * product, and two knowledge base entries. Two customers matter — most of the
 * security tests are about customer A not seeing customer B's data.
 */
export async function seedFixture(overrides: { slug?: string } = {}): Promise<TestFixture> {
  const slug = overrides.slug ?? `test-${randomUUID().slice(0, 8)}`;
  const channelAccountExternalId = `PNID_${randomUUID().slice(0, 8)}`;

  const tenant = await query<{ id: string }>(
    `INSERT INTO tenants (slug, name, settings)
     VALUES ($1, 'Test Store', '{"brandName":"متجر الاختبار","supportPhone":"920000111"}'::jsonb)
     RETURNING id`,
    [slug],
  );
  const tenantId = tenant.rows[0]!.id;

  await query(
    `INSERT INTO channel_accounts (tenant_id, channel, external_id, display_name)
     VALUES ($1, 'whatsapp', $2, 'Test WhatsApp')`,
    [tenantId, channelAccountExternalId],
  );

  const customerPhone = '966510000001';
  const otherCustomerPhone = '966510000002';

  const c1 = await query<{ id: string }>(
    `INSERT INTO customers (tenant_id, phone, name, email) VALUES ($1,$2,'سعود','saud@example.com') RETURNING id`,
    [tenantId, customerPhone],
  );
  const c2 = await query<{ id: string }>(
    `INSERT INTO customers (tenant_id, phone, name) VALUES ($1,$2,'نورة') RETURNING id`,
    [tenantId, otherCustomerPhone],
  );
  const customerId = c1.rows[0]!.id;
  const otherCustomerId = c2.rows[0]!.id;

  const productSku = 'TST-001';
  const product = await query<{ id: string }>(
    `INSERT INTO products (tenant_id, sku, name, name_en, category, price, sale_price, stock_quantity)
     VALUES ($1,$2,'سماعة اختبار','Test Headphones','الكترونيات',349.00,299.00,10) RETURNING id`,
    [tenantId, productSku],
  );

  const orderNumber = 'TS-1001';
  const order = await query<{ id: string }>(
    `INSERT INTO orders (tenant_id, customer_id, order_number, status, payment_status,
                         total_amount, shipping_company, tracking_number, shipping_address)
     VALUES ($1,$2,$3,'shipped','paid',299.00,'سمسا','SM123456789','{"city":"الرياض"}'::jsonb)
     RETURNING id`,
    [tenantId, customerId, orderNumber],
  );
  await query(
    `INSERT INTO order_items (order_id, product_id, sku, name, quantity, unit_price)
     VALUES ($1,$2,$3,'سماعة اختبار',1,299.00)`,
    [order.rows[0]!.id, product.rows[0]!.id, productSku],
  );

  const otherOrderNumber = 'TS-2002';
  await query(
    `INSERT INTO orders (tenant_id, customer_id, order_number, status, payment_status, total_amount)
     VALUES ($1,$2,$3,'processing','paid',777.00)`,
    [tenantId, otherCustomerId, otherOrderNumber],
  );

  await query(
    `INSERT INTO knowledge_base (tenant_id, category, title, question, answer, keywords, priority)
     VALUES
       ($1,'shipping','رسوم الشحن','كم رسوم الشحن؟','رسوم الشحن ٢٥ ريال داخل المملكة، ومجاني للطلبات فوق ٢٠٠ ريال.',
        ARRAY['رسوم التوصيل','كم الشحن','شحن مجاني'],90),
       ($1,'returns','سياسة الاسترجاع','كيف أرجع المنتج؟','تقدر ترجع المنتج خلال ١٤ يوم من استلامه بحالته الأصلية.',
        ARRAY['ارجاع','استرجاع','رد المبلغ'],95)`,
    [tenantId],
  );

  return {
    tenantId, channelAccountExternalId, customerId, customerPhone,
    otherCustomerId, otherCustomerPhone, orderNumber, otherOrderNumber, productSku,
  };
}
