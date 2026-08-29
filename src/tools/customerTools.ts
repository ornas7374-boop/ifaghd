import { z } from 'zod';
import { getCustomerById } from '../db/repositories/customers.js';
import { listCustomerOrders } from '../db/repositories/commerce.js';
import { requireCapability } from '../security/authz.js';
import { maskEmail } from '../security/outputFilter.js';
import type { ToolDefinition } from './types.js';

/**
 * get_customer — returns the profile of the customer in THIS conversation.
 *
 * It deliberately takes no identifier argument. Even if the model is talked
 * into asking for someone else, there is no parameter through which to do so.
 */
const GetCustomerInput = z.object({
  include_recent_orders: z.boolean().optional().describe('Include the customer\'s last few orders (numbers and statuses only).'),
});

const GetCustomerOutput = z.object({
  found: z.boolean(),
  name: z.string().nullable(),
  is_known_customer: z.boolean(),
  locale: z.string(),
  customer_since: z.string().nullable(),
  email: z.string().nullable(),
  recent_orders: z.array(z.object({
    order_number: z.string(),
    status: z.string(),
    placed_at: z.string(),
    total_amount: z.number(),
    currency: z.string(),
  })).optional(),
});

export const getCustomerTool: ToolDefinition<z.infer<typeof GetCustomerInput>, z.infer<typeof GetCustomerOutput>> = {
  name: 'get_customer',
  description:
    'Get the profile of the customer you are currently talking to (name, whether they are a known customer, ' +
    'and optionally their recent orders). Takes no customer identifier — it always returns the current ' +
    'customer only. Use it when you need their name or want to check if they have orders.',
  inputSchema: GetCustomerInput,
  outputSchema: GetCustomerOutput,
  requiredCapabilities: ['customer:read_self'],
  sideEffect: 'none',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'customer:read_self');
    if (!ctx.customerId) {
      return { ok: false, error: { code: 'no_customer_context', message: 'No customer bound to this session.', retryable: false } };
    }

    const customer = await getCustomerById(ctx.tenantId, ctx.customerId);
    if (!customer) {
      return { ok: false, error: { code: 'customer_not_found', message: 'Customer record not found.', retryable: false } };
    }

    const data: z.infer<typeof GetCustomerOutput> = {
      found: true,
      name: customer.name,
      is_known_customer: true,
      locale: customer.locale,
      customer_since: customer.first_seen_at ? new Date(customer.first_seen_at).toISOString().slice(0, 10) : null,
      email: customer.email ? maskEmail(customer.email) : null,
    };

    if (input.include_recent_orders) {
      requireCapability(ctx.principal, 'order:read_self');
      const orders = await listCustomerOrders(ctx.tenantId, ctx.customerId, 5);
      data.recent_orders = orders.map((o) => ({
        order_number: o.order_number,
        status: o.status,
        placed_at: new Date(o.placed_at).toISOString().slice(0, 10),
        total_amount: Number(o.total_amount),
        currency: o.currency,
      }));
    }

    return { ok: true, data };
  },
};
