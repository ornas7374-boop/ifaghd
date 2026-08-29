import { query } from '../pool.js';
import type { Order, OrderItem, Product } from '../types.js';

/**
 * Orders are always looked up scoped to a tenant AND (when the caller is a
 * customer conversation) to that customer. The customer scope is enforced
 * here in SQL, not by the prompt — that is what stops one customer reading
 * another's order by guessing a number.
 */
export async function getOrder(params: {
  tenantId: string;
  orderNumber?: string;
  orderId?: string;
  customerId?: string | null;
}): Promise<Order | null> {
  const clauses = ['o.tenant_id = $1'];
  const values: unknown[] = [params.tenantId];

  if (params.orderNumber) {
    values.push(params.orderNumber.trim());
    clauses.push(`upper(o.order_number) = upper($${values.length})`);
  }
  if (params.orderId) {
    values.push(params.orderId);
    clauses.push(`o.id = $${values.length}`);
  }
  if (params.customerId) {
    values.push(params.customerId);
    clauses.push(`o.customer_id = $${values.length}`);
  }
  if (!params.orderNumber && !params.orderId) return null;

  const { rows } = await query<Order>(
    `SELECT o.* FROM orders o WHERE ${clauses.join(' AND ')} LIMIT 1`,
    values,
  );
  const order = rows[0];
  if (!order) return null;

  const items = await query<OrderItem>(
    'SELECT id, order_id, sku, name, quantity, unit_price FROM order_items WHERE order_id = $1 ORDER BY created_at',
    [order.id],
  );
  return { ...order, items: items.rows };
}

export async function listCustomerOrders(tenantId: string, customerId: string, limit = 5): Promise<Order[]> {
  const { rows } = await query<Order>(
    `SELECT * FROM orders
      WHERE tenant_id = $1 AND customer_id = $2
      ORDER BY placed_at DESC LIMIT $3`,
    [tenantId, customerId, limit],
  );
  return rows;
}

/**
 * Product search combining exact SKU, prefix, and trigram similarity so that
 * Arabic queries with different spacing/spelling still match.
 */
export async function searchProducts(params: {
  tenantId: string;
  q: string;
  category?: string | null;
  limit?: number;
  inStockOnly?: boolean;
}): Promise<Array<Product & { score: number }>> {
  const limit = Math.min(params.limit ?? 5, 20);
  const q = params.q.trim();
  if (!q) return [];

  // Matched over ar_normalize()d text so "السماعة" finds "سماعة" — see
  // migration 007 for why Postgres cannot do this for Arabic on its own.
  const { rows } = await query<Product & { score: number }>(
    `WITH q AS (SELECT ar_normalize($2) AS norm)
     SELECT p.*,
            GREATEST(
              CASE WHEN upper(p.sku) = upper($2) THEN 1.0 ELSE 0 END,
              similarity(ar_normalize(p.name), q.norm),
              COALESCE(similarity(ar_normalize(p.name_en), q.norm), 0),
              CASE WHEN ar_normalize(p.name) LIKE '%' || q.norm || '%' THEN 0.65 ELSE 0 END,
              CASE WHEN ar_normalize(COALESCE(p.name_en, '')) LIKE '%' || q.norm || '%' THEN 0.6 ELSE 0 END,
              CASE WHEN ar_normalize(COALESCE(p.category, '')) LIKE '%' || q.norm || '%' THEN 0.45 ELSE 0 END
            ) AS score
       FROM products p, q
      WHERE p.tenant_id = $1
        AND p.is_active = TRUE
        AND ($3::text IS NULL OR p.category = $3)
        AND ($4::boolean IS FALSE OR p.stock_quantity > 0)
      ORDER BY score DESC, p.name
      LIMIT $5`,
    [params.tenantId, q, params.category ?? null, params.inStockOnly ?? false, limit],
  );
  // Below this threshold the "match" is noise; returning it would invite the
  // model to quote a price for the wrong product.
  return rows.filter((r) => r.score >= 0.2);
}

export async function getProductBySku(tenantId: string, sku: string): Promise<Product | null> {
  const { rows } = await query<Product>(
    'SELECT * FROM products WHERE tenant_id = $1 AND upper(sku) = upper($2) AND is_active = TRUE',
    [tenantId, sku],
  );
  return rows[0] ?? null;
}

export async function getProductById(tenantId: string, id: string): Promise<Product | null> {
  const { rows } = await query<Product>(
    'SELECT * FROM products WHERE tenant_id = $1 AND id = $2 AND is_active = TRUE',
    [tenantId, id],
  );
  return rows[0] ?? null;
}
