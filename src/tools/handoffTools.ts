import { z } from 'zod';
import { requireCapability } from '../security/authz.js';
import { escalateToHuman } from '../handoff/service.js';
import type { HandoffReason } from '../db/types.js';
import type { ToolDefinition } from './types.js';

const REASONS = [
  'customer_request', 'angry_customer', 'sensitive_issue', 'low_confidence',
  'tool_failure', 'missing_information', 'repeated_failure', 'policy_violation',
] as const;

const HandoffInput = z.object({
  reason_code: z.enum(REASONS).describe('Why a human is needed.'),
  reason_detail: z.string().trim().min(3).max(500).describe('One or two sentences for the colleague picking this up.'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  conversation_summary: z.string().trim().max(1000).optional().describe('Short summary of what the customer needs.'),
});

const HandoffOutput = z.object({
  handed_off: z.boolean(),
  handoff_id: z.string(),
  priority: z.string(),
  already_pending: z.boolean(),
  notification_status: z.string(),
  customer_message: z.string().describe('Send this to the customer verbatim; it does not promise a resolution.'),
});

/**
 * handoff_to_human — the escape hatch the whole design leans on.
 *
 * Anything the agent cannot ground in a tool result or the knowledge base
 * should end here rather than in a guess.
 */
export const handoffToHumanTool: ToolDefinition<z.infer<typeof HandoffInput>, z.infer<typeof HandoffOutput>> = {
  name: 'handoff_to_human',
  description:
    'Transfer this conversation to a human colleague. Call this when: the customer asks for a person; the ' +
    'customer is angry or the issue is sensitive; a tool failed; the knowledge base has no answer; or you ' +
    'are not confident. After calling it, send the returned customer_message and stop. Using this is always ' +
    'better than guessing an answer.',
  inputSchema: HandoffInput,
  outputSchema: HandoffOutput,
  requiredCapabilities: ['handoff:create'],
  sideEffect: 'notifies_human',
  async handler(input, ctx) {
    requireCapability(ctx.principal, 'handoff:create');
    if (!ctx.conversationId || !ctx.customerId) {
      return { ok: false, error: { code: 'no_conversation_context', message: 'No conversation bound to this session.', retryable: false } };
    }

    const result = await escalateToHuman({
      tenantId: ctx.tenantId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      reasonCode: input.reason_code as HandoffReason,
      reasonDetail: input.reason_detail,
      priority: input.priority,
      conversationSummary: input.conversation_summary ?? null,
      traceId: ctx.traceId,
    });

    return {
      ok: true,
      data: {
        handed_off: true,
        handoff_id: result.handoff.id,
        priority: result.handoff.priority,
        already_pending: result.alreadyPending,
        notification_status: result.notification.status,
        customer_message: result.customerMessage,
      },
    };
  },
};
