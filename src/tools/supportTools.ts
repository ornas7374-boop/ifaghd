import { z } from 'zod';
import { createTicket, findRecentTicketForConversation } from '../db/repositories/handoffs.js';
import { getOrder } from '../db/repositories/commerce.js';
import { requireCapability } from '../security/authz.js';
import type { Priority, TicketCategory } from '../db/types.js';
import type { ToolDefinition } from './types.js';

const TICKET_CATEGORIES = [
  'order_issue', 'return_request', 'exchange_request', 'complaint',
  'product_question', 'shipping_issue', 'payment_issue', 'other',
] as const;

const CreateTicketInput = z.object({
  category: z.enum(TICKET_CATEGORIES).describe('The kind of issue.'),
  subject: z.string().trim().min(3).max(140).describe('One-line summary in Arabic.'),
  description: z.string().trim().min(5).max(2000).describe('What the customer asked for, in their own words plus relevant context.'),
  order_number: z.string().trim().max(40).optional().describe('Related order number, if the customer gave one.'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

const CreateTicketOutput = z.object({
  created: z.boolean(),
  ticket_number: z.string(),
  status: z.string(),
  duplicate_of_existing: z.boolean(),
  customer_message: z.string().describe('Ready-to-send Arabic confirmation the agent may quote verbatim.'),
});

/**
 * create_support_ticket — the only "write" the agent can perform, and it
 * writes only to our own support table. It cannot touch orders, refunds, or
 * customer records, so the worst case is a spurious ticket a human closes.
 */
export const createSupportTicketTool: ToolDefinition<z.infer<typeof CreateTicketInput>, z.infer<typeof CreateTicketOutput>> = {
  name: 'create_support_ticket',
  description:
    'Open a support ticket for the current customer so a colleague can follow up (returns, exchanges, ' +
    'complaints, order problems). This records the request — it does NOT process a refund, cancel an order, ' +
    'or change anything in the store. Never tell the customer an action was completed; tell them the request ' +
    'was registered and a colleague will follow up.',
  inputSchema: CreateTicketInput,
  outputSchema: CreateTicketOutput,
  requiredCapabilities: ['ticket:create'],
  sideEffect: 'creates_record',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'ticket:create');
    if (!ctx.customerId) {
      return { ok: false, error: { code: 'no_customer_context', message: 'No customer bound to this session.', retryable: false } };
    }

    // Don't open a second ticket for the same thing in the same chat.
    if (ctx.conversationId) {
      const existing = await findRecentTicketForConversation(ctx.conversationId, input.category as TicketCategory);
      if (existing) {
        return {
          ok: true,
          data: {
            created: false,
            ticket_number: existing.ticket_number,
            status: existing.status,
            duplicate_of_existing: true,
            customer_message: `طلبك مسجّل عندنا برقم ${existing.ticket_number} ولا زال قيد المتابعة، وبيتواصل معك أحد الزملاء.`,
          },
        };
      }
    }

    let orderId: string | null = null;
    if (input.order_number) {
      const order = await getOrder({ tenantId: ctx.tenantId, orderNumber: input.order_number, customerId: ctx.customerId });
      orderId = order?.id ?? null;
    }

    const ticket = await createTicket({
      tenantId: ctx.tenantId,
      customerId: ctx.customerId,
      conversationId: ctx.conversationId ?? null,
      orderId,
      category: input.category as TicketCategory,
      subject: input.subject,
      description: input.description,
      priority: (input.priority as Priority | undefined) ?? 'normal',
      createdBy: 'agent',
      metadata: { trace_id: ctx.traceId, order_number_given: input.order_number ?? null, order_matched: Boolean(orderId) },
    });

    return {
      ok: true,
      data: {
        created: true,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        duplicate_of_existing: false,
        customer_message: `تم تسجيل طلبك برقم ${ticket.ticket_number}، وبيتواصل معك أحد الزملاء قريب.`,
      },
    };
  },
};
