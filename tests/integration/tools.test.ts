import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { ensureSchema, truncateAll, seedFixture, closePool, query, type TestFixture } from '../helpers/testDb.js';
import { executeTool, toolsForContext, toLlmToolDefinitions, listTools } from '../../src/tools/registry.js';
import { customerPrincipal, staffPrincipal } from '../../src/security/authz.js';
import { getTenantById } from '../../src/db/repositories/tenants.js';
import type { ToolContext } from '../../src/tools/types.js';

let fx: TestFixture;
let ctx: ToolContext;

beforeAll(async () => { await ensureSchema(); });
afterAll(async () => { await closePool(); });

beforeEach(async () => {
  await truncateAll();
  fx = await seedFixture();
  const tenant = (await getTenantById(fx.tenantId))!;
  const conversation = await query<{ id: string }>(
    `INSERT INTO conversations (tenant_id, customer_id, channel) VALUES ($1,$2,'whatsapp') RETURNING id`,
    [fx.tenantId, fx.customerId],
  );
  ctx = {
    principal: customerPrincipal(fx.tenantId, fx.customerId),
    tenant,
    tenantId: fx.tenantId,
    customerId: fx.customerId,
    conversationId: conversation.rows[0]!.id,
    traceId: 'trc_test',
    locale: 'ar-SA',
  };
});

describe('tool registry', () => {
  it('exposes every tool the brief requires', () => {
    expect(listTools().map((t) => t.name).sort()).toEqual([
      'create_support_ticket', 'get_customer', 'get_order', 'get_order_status',
      'get_product_price', 'handoff_to_human', 'search_knowledge_base', 'search_products',
    ]);
  });

  it('emits valid JSON Schema for every tool input', () => {
    for (const def of toLlmToolDefinitions(listTools())) {
      expect(def.inputSchema.type, def.name).toBe('object');
      expect(def.inputSchema).toHaveProperty('properties');
      expect(def.description.length, def.name).toBeGreaterThan(40);
    }
  });

  it('hides tools the principal lacks capabilities for', () => {
    const readOnly = { ...ctx, principal: staffPrincipal(fx.tenantId, 'staff1', ['kb:read']) };
    expect(toolsForContext(readOnly).map((t) => t.name)).toEqual(['search_knowledge_base']);
  });

  it('hides tools the tenant disabled, without a deploy', async () => {
    await query(`UPDATE tenants SET settings = settings || '{"disabledTools":["search_products"]}'::jsonb WHERE id = $1`, [fx.tenantId]);
    const tenant = (await getTenantById(fx.tenantId))!;
    expect(toolsForContext({ ...ctx, tenant }).map((t) => t.name)).not.toContain('search_products');
  });

  it('rejects an unknown tool name instead of throwing', async () => {
    const { result } = await executeTool('drop_database', {}, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unknown_tool');
  });

  it('rejects invalid arguments with a message the model can act on', async () => {
    const { result } = await executeTool('get_order', { order_number: '' }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
  });

  it('blocks a tool the principal has no capability for', async () => {
    const noCaps = { ...ctx, principal: staffPrincipal(fx.tenantId, 's', ['kb:read']) };
    const { result } = await executeTool('get_order_status', { order_number: fx.orderNumber }, noCaps);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('forbidden');
  });

  it('writes an audit row for every call', async () => {
    await executeTool('search_knowledge_base', { query: 'الشحن' }, ctx);
    const { rows } = await query('SELECT step, status FROM agent_logs WHERE trace_id = $1', ['trc_test']);
    expect(rows).toContainEqual(expect.objectContaining({ step: 'tool.search_knowledge_base', status: 'ok' }));
  });
});

describe('get_order_status', () => {
  it("returns the customer's real order", async () => {
    const { result } = await executeTool('get_order_status', { order_number: fx.orderNumber }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        found: true, order_number: 'TS-1001', status: 'shipped',
        status_label: 'تم الشحن', tracking_number: 'SM123456789', total_amount: 299,
      });
    }
  });

  it('falls back to the most recent order when no number is given', async () => {
    const { result } = await executeTool('get_order_status', {}, ctx);
    expect(result.ok && (result.data as { order_number: string }).order_number).toBe('TS-1001');
  });

  it("refuses another customer's order even though it exists", async () => {
    const { result } = await executeTool('get_order_status', { order_number: fx.otherOrderNumber }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { found: boolean; total_amount?: number };
      expect(data.found).toBe(false);
      expect(data.total_amount).toBeUndefined();
    }
  });

  it('reports not-found for an order that does not exist, never a guess', async () => {
    const { result } = await executeTool('get_order_status', { order_number: 'SA-99999' }, ctx);
    expect(result.ok && (result.data as { found: boolean }).found).toBe(false);
  });

  it('rejects an order number containing SQL metacharacters', async () => {
    const { result } = await executeTool('get_order_status', { order_number: "TS-1001' OR '1'='1" }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_input');
  });
});

describe('get_customer', () => {
  it('returns only the current customer and masks their email', async () => {
    const { result } = await executeTool('get_customer', { include_recent_orders: true }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { name: string; email: string; recent_orders: unknown[] };
      expect(data.name).toBe('سعود');
      expect(data.email).toBe('sa***@example.com');
      expect(data.recent_orders).toHaveLength(1);
    }
  });

  it('has no parameter through which another customer could be requested', () => {
    const def = toLlmToolDefinitions(listTools()).find((t) => t.name === 'get_customer')!;
    const props = Object.keys((def.inputSchema as { properties: Record<string, unknown> }).properties);
    expect(props).toEqual(['include_recent_orders']);
  });
});

describe('product tools', () => {
  it('finds a product and reports the effective (sale) price', async () => {
    const { result } = await executeTool('search_products', { query: 'سماعة' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { count: number; results: Array<{ price: number; effective_price: number }> };
      expect(data.count).toBe(1);
      expect(data.results[0]).toMatchObject({ price: 349, sale_price: 299, effective_price: 299, in_stock: true });
    }
  });

  it('returns zero results and a do-not-invent note for an unknown product', async () => {
    const { result } = await executeTool('search_products', { query: 'ثلاجة' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { count: number; note?: string };
      expect(data.count).toBe(0);
      expect(data.note).toMatch(/Do not invent/i);
    }
  });

  it('gives an exact price for an exact SKU', async () => {
    const { result } = await executeTool('get_product_price', { sku: fx.productSku }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toMatchObject({ found: true, exact_match: true });
  });

  it('refuses to quote a price for a product that does not exist', async () => {
    const { result } = await executeTool('get_product_price', { product_name: 'ثلاجة ذكية' }, ctx);
    expect(result.ok && (result.data as { found: boolean }).found).toBe(false);
  });

  it('asks which variant instead of quoting a price when two match equally', async () => {
    // The realistic failure mode: colour/size variants at different prices.
    // Picking one would quote the customer the wrong number.
    await query(
      `INSERT INTO products (tenant_id, sku, name, price, stock_quantity) VALUES
         ($1,'TST-010','سماعة بلوتوث سوداء',299.00,5),
         ($1,'TST-011','سماعة بلوتوث بيضاء',329.00,5)`,
      [fx.tenantId],
    );
    const { result } = await executeTool('get_product_price', { product_name: 'سماعة بلوتوث' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { found: boolean; candidates?: Array<{ sku: string }>; note?: string };
      expect(data.found).toBe(false);
      expect(data.candidates?.length).toBeGreaterThan(1);
      expect(data.note).toMatch(/Ask the customer which one/i);
    }
  });

  it('still quotes a price when one product clearly wins', async () => {
    await query(
      `INSERT INTO products (tenant_id, sku, name, price, stock_quantity) VALUES
         ($1,'TST-010','سماعة بلوتوث سوداء',299.00,5),
         ($1,'TST-011','سماعة بلوتوث بيضاء',329.00,5)`,
      [fx.tenantId],
    );
    const { result } = await executeTool('get_product_price', { product_name: 'سماعة بلوتوث سوداء' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { found: boolean; product?: { sku: string; price: number } };
      expect(data.found).toBe(true);
      expect(data.product).toMatchObject({ sku: 'TST-010', price: 299 });
    }
  });
});

describe('knowledge base tool', () => {
  it('returns the matching entry', async () => {
    const { result } = await executeTool('search_knowledge_base', { query: 'كم رسوم الشحن؟' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { count: number; results: Array<{ title: string }> };
      expect(data.count).toBeGreaterThan(0);
      expect(data.results[0]!.title).toBe('رسوم الشحن');
    }
  });

  it('returns nothing for an off-topic question, so the model has nothing to answer from', async () => {
    const { result } = await executeTool('search_knowledge_base', { query: 'ما هي عاصمة فرنسا؟' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { count: number; note?: string };
      expect(data.count).toBe(0);
      expect(data.note).toMatch(/Do not answer from general knowledge/i);
    }
  });

  it('never returns another tenant\'s knowledge base', async () => {
    const other = await seedFixture({ slug: 'other-tenant' });
    const { result } = await executeTool('search_knowledge_base', { query: 'الشحن' }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const ids = (result.data as { results: Array<{ id: string }> }).results.map((r) => r.id);
      const { rows } = await query<{ id: string }>('SELECT id FROM knowledge_base WHERE tenant_id = $1', [other.tenantId]);
      for (const row of rows) expect(ids).not.toContain(row.id);
    }
  });
});

describe('support ticket tool', () => {
  it('creates a ticket and returns wording that does not claim the issue is resolved', async () => {
    const { result } = await executeTool('create_support_ticket', {
      category: 'return_request', subject: 'طلب استرجاع',
      description: 'العميل يبي يرجع السماعة', order_number: fx.orderNumber,
    }, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as { created: boolean; ticket_number: string; customer_message: string };
      expect(data.created).toBe(true);
      expect(data.ticket_number).toMatch(/^TCK-\d{6}$/);
      expect(data.customer_message).toContain('تم تسجيل طلبك');
      expect(data.customer_message).not.toMatch(/تم الاسترجاع|تم إرجاع المبلغ/);
    }
  });

  it('links the ticket to the real order', async () => {
    await executeTool('create_support_ticket', {
      category: 'order_issue', subject: 'مشكلة', description: 'وصف المشكلة', order_number: fx.orderNumber,
    }, ctx);
    const { rows } = await query<{ order_id: string | null }>('SELECT order_id FROM support_tickets');
    expect(rows[0]!.order_id).not.toBeNull();
  });

  it('does not open a duplicate ticket for the same issue in one conversation', async () => {
    const first = await executeTool('create_support_ticket', {
      category: 'complaint', subject: 'شكوى', description: 'العميل غير راضٍ',
    }, ctx);
    const second = await executeTool('create_support_ticket', {
      category: 'complaint', subject: 'شكوى مرة ثانية', description: 'نفس الشكوى',
    }, ctx);

    expect(first.result.ok && (first.result.data as { created: boolean }).created).toBe(true);
    expect(second.result.ok && (second.result.data as { created: boolean }).created).toBe(false);
    expect(second.result.ok && (second.result.data as { duplicate_of_existing: boolean }).duplicate_of_existing).toBe(true);

    const { rows } = await query('SELECT id FROM support_tickets');
    expect(rows).toHaveLength(1);
  });

  it('issues sequential ticket numbers without gaps or collisions', async () => {
    const categories = ['order_issue', 'shipping_issue', 'payment_issue'] as const;
    for (const category of categories) {
      await executeTool('create_support_ticket', { category, subject: `س ${category}`, description: 'وصف كافٍ' }, ctx);
    }
    const { rows } = await query<{ ticket_number: string }>('SELECT ticket_number FROM support_tickets ORDER BY created_at');
    expect(rows.map((r) => r.ticket_number)).toEqual(['TCK-000001', 'TCK-000002', 'TCK-000003']);
  });
});
