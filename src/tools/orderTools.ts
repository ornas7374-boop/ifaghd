import { z } from 'zod';
import { getOrder, listCustomerOrders } from '../db/repositories/commerce.js';
import { requireCapability, assertSameTenant } from '../security/authz.js';
import type { ToolDefinition } from './types.js';

/** Arabic labels the agent can quote verbatim — no invented status wording. */
const STATUS_LABELS_AR: Record<string, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'تم تأكيد الطلب',
  processing: 'قيد التجهيز',
  shipped: 'تم الشحن',
  out_for_delivery: 'مع المندوب للتوصيل',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
  returned: 'مرتجع',
  refunded: 'تم استرجاع المبلغ',
};

const PAYMENT_LABELS_AR: Record<string, string> = {
  unpaid: 'غير مدفوع',
  paid: 'مدفوع',
  partially_refunded: 'مسترجع جزئياً',
  refunded: 'مسترجع بالكامل',
  failed: 'فشلت عملية الدفع',
};

const OrderNumber = z
  .string()
  .trim()
  .min(3)
  .max(40)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_\-\/]{2,39}$/, 'order_number contains unsupported characters')
  .describe('The order number exactly as the customer stated it, e.g. "SA-10231".');

const GetOrderStatusInput = z.object({
  order_number: OrderNumber.optional().describe(
    'Omit to get the customer\'s most recent order. Only pass a number the customer actually gave you.',
  ),
});

const OrderStatusOutput = z.object({
  found: z.boolean(),
  order_number: z.string().optional(),
  status: z.string().optional(),
  status_label: z.string().optional(),
  payment_status: z.string().optional(),
  payment_label: z.string().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  shipping_company: z.string().nullable().optional(),
  tracking_number: z.string().nullable().optional(),
  tracking_url: z.string().nullable().optional(),
  estimated_delivery: z.string().nullable().optional(),
  placed_at: z.string().optional(),
  delivered_at: z.string().nullable().optional(),
  item_count: z.number().optional(),
  reason: z.string().optional(),
});

/**
 * get_order_status — the anti-hallucination workhorse.
 *
 * Scoped to ctx.customerId in SQL, so "check order SA-99999 for me" on someone
 * else's order returns not_found rather than another customer's data.
 */
export const getOrderStatusTool: ToolDefinition<z.infer<typeof GetOrderStatusInput>, z.infer<typeof OrderStatusOutput>> = {
  name: 'get_order_status',
  description:
    'Look up the real status of an order belonging to the current customer. Returns the live status, payment ' +
    'state, shipping company and tracking number. ALWAYS call this before telling a customer anything about ' +
    'their order — never state a status from memory or assumption. If it returns found:false, tell the ' +
    'customer you could not find that order and offer to connect them to a human.',
  inputSchema: GetOrderStatusInput,
  outputSchema: OrderStatusOutput,
  requiredCapabilities: ['order:read_self'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'order:read_self');
    if (!ctx.customerId) {
      return { ok: false, error: { code: 'no_customer_context', message: 'No customer bound to this session.', retryable: false } };
    }

    let order = null;
    if (input.order_number) {
      order = await getOrder({ tenantId: ctx.tenantId, orderNumber: input.order_number, customerId: ctx.customerId });
    } else {
      const recent = await listCustomerOrders(ctx.tenantId, ctx.customerId, 1);
      const latest = recent[0];
      if (latest) order = await getOrder({ tenantId: ctx.tenantId, orderId: latest.id, customerId: ctx.customerId });
    }

    if (!order) {
      return {
        ok: true,
        data: {
          found: false,
          reason: input.order_number
            ? 'No order with that number is linked to this customer.'
            : 'This customer has no orders on record.',
        },
      };
    }

    assertSameTenant(ctx.principal, order, 'order');

    return {
      ok: true,
      data: {
        found: true,
        order_number: order.order_number,
        status: order.status,
        status_label: STATUS_LABELS_AR[order.status] ?? order.status,
        payment_status: order.payment_status,
        payment_label: PAYMENT_LABELS_AR[order.payment_status] ?? order.payment_status,
        total_amount: Number(order.total_amount),
        currency: order.currency,
        shipping_company: order.shipping_company,
        tracking_number: order.tracking_number,
        tracking_url: order.tracking_url,
        estimated_delivery: order.estimated_delivery ? new Date(order.estimated_delivery).toISOString().slice(0, 10) : null,
        placed_at: new Date(order.placed_at).toISOString().slice(0, 10),
        delivered_at: order.delivered_at ? new Date(order.delivered_at).toISOString().slice(0, 10) : null,
        item_count: order.items?.length ?? 0,
      },
    };
  },
};

const GetOrderInput = z.object({
  order_number: OrderNumber.describe('The order number the customer gave you.'),
});

const GetOrderOutput = OrderStatusOutput.extend({
  items: z.array(z.object({
    name: z.string(),
    sku: z.string().nullable(),
    quantity: z.number(),
    unit_price: z.number(),
  })).optional(),
  shipping_city: z.string().nullable().optional(),
});

/** get_order — full detail including line items, for "what did I order?" */
export const getOrderTool: ToolDefinition<z.infer<typeof GetOrderInput>, z.infer<typeof GetOrderOutput>> = {
  name: 'get_order',
  description:
    'Get the full details of one of the current customer\'s orders, including the items in it. Use when the ' +
    'customer asks what is in their order or about a specific item. Only returns orders belonging to this customer.',
  inputSchema: GetOrderInput,
  outputSchema: GetOrderOutput,
  requiredCapabilities: ['order:read_self'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'order:read_self');
    if (!ctx.customerId) {
      return { ok: false, error: { code: 'no_customer_context', message: 'No customer bound to this session.', retryable: false } };
    }

    const order = await getOrder({ tenantId: ctx.tenantId, orderNumber: input.order_number, customerId: ctx.customerId });
    if (!order) {
      return { ok: true, data: { found: false, reason: 'No order with that number is linked to this customer.' } };
    }
    assertSameTenant(ctx.principal, order, 'order');

    const address = order.shipping_address as { city?: string } | null;
    return {
      ok: true,
      data: {
        found: true,
        order_number: order.order_number,
        status: order.status,
        status_label: STATUS_LABELS_AR[order.status] ?? order.status,
        payment_status: order.payment_status,
        payment_label: PAYMENT_LABELS_AR[order.payment_status] ?? order.payment_status,
        total_amount: Number(order.total_amount),
        currency: order.currency,
        shipping_company: order.shipping_company,
        tracking_number: order.tracking_number,
        tracking_url: order.tracking_url,
        estimated_delivery: order.estimated_delivery ? new Date(order.estimated_delivery).toISOString().slice(0, 10) : null,
        placed_at: new Date(order.placed_at).toISOString().slice(0, 10),
        delivered_at: order.delivered_at ? new Date(order.delivered_at).toISOString().slice(0, 10) : null,
        item_count: order.items?.length ?? 0,
        shipping_city: address?.city ?? null,
        items: (order.items ?? []).map((i) => ({
          name: i.name,
          sku: i.sku,
          quantity: i.quantity,
          unit_price: Number(i.unit_price),
        })),
      },
    };
  },
};
