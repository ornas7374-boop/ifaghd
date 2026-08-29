import { env } from '../config/env.js';
import { complete, estimateCostUsd } from '../llm/index.js';
import { logger } from '../observability/logger.js';
import { toErrorInfo } from '../utils/errors.js';
import { writeAgentLog } from '../db/repositories/logs.js';
import { customerPrincipal } from '../security/authz.js';
import { inspectInboundText, wrapUntrusted } from '../security/promptGuard.js';
import { scanOutboundText } from '../security/outputFilter.js';
import { executeTool, toLlmToolDefinitions, toolsForContext } from '../tools/registry.js';
import { escalateToHuman } from '../handoff/service.js';
import { buildSystemPrompt } from './prompts/systemPrompt.js';
import { checkGrounding } from './grounding.js';
import { classifyIntent, intentForcesHandoff, type IntentResult } from './intent.js';
import { loadMemory } from './memory.js';
import type { Conversation, Customer, HandoffReason, Tenant } from '../db/types.js';
import type { LlmContentBlock, LlmMessage } from '../llm/types.js';
import type { ToolContext, ToolInvocation } from '../tools/types.js';

export interface AgentTurnInput {
  tenant: Tenant;
  customer: Customer;
  conversation: Conversation;
  messageText: string;
  traceId: string;
}

export interface AgentTurnResult {
  reply: string;
  intent: IntentResult;
  toolInvocations: ToolInvocation[];
  handedOff: boolean;
  handoffReason: HandoffReason | null;
  escalated: boolean;
  guardrail: { injectionVerdict: string; groundingViolations: string[]; outputFilterReasons: string[] };
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
  model: string;
  latencyMs: number;
}

/** Sent only when everything else has failed. Never claims to know anything. */
const FALLBACK_REPLY = 'عذراً، واجهتني مشكلة تقنية بسيطة. حوّلت طلبك لأحد الزملاء وبيتواصل معك قريب.';

/**
 * Runs one customer turn end to end: guard → classify → memory → LLM tool loop
 * → grounding → output filter. Any step that cannot produce a *grounded*
 * answer routes to a human instead of guessing.
 */
export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const cfg = env();
  const log = logger();
  const startedAt = Date.now();
  const { tenant, customer, conversation, traceId } = input;

  const usage = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  const toolInvocations: ToolInvocation[] = [];
  let model = cfg.LLM_MODEL;

  // ---- 1. Inbound guard --------------------------------------------------
  const guard = inspectInboundText(input.messageText);
  if (guard.verdict !== 'clean') {
    await writeAgentLog({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
      step: 'guardrail.inbound', level: 'warn',
      status: guard.verdict === 'blocked' ? 'blocked' : 'ok',
      detail: { verdict: guard.verdict, score: guard.score, matched: guard.matched },
    });
  }

  if (guard.verdict === 'blocked') {
    // Refuse without escalating: this is an attack, not a customer with a problem.
    const reply = 'أقدر أساعدك في استفسارات المتجر والطلبات فقط. كيف أقدر أخدمك؟';
    return finish({
      reply,
      intent: { intent: 'other', confidence: 1, sentiment: 'neutral', language: 'ar', source: 'rules' },
      handedOff: false, handoffReason: null, escalated: false,
      guardrail: { injectionVerdict: guard.verdict, groundingViolations: [], outputFilterReasons: ['blocked_injection'] },
    });
  }

  // ---- 2. Intent ---------------------------------------------------------
  const memory = await loadMemory({ conversation, customer });
  const intent = await classifyIntent({ text: guard.sanitized, recentMessages: [] });

  await writeAgentLog({
    tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
    step: 'intent.classify',
    detail: { intent: intent.intent, confidence: intent.confidence, sentiment: intent.sentiment, source: intent.source },
  });

  // ---- 3. Deterministic escalation ---------------------------------------
  // Some cases must never depend on the model choosing correctly.
  const forcedReason = forcedHandoffReason(intent, tenant);
  if (forcedReason) {
    const escalation = await escalateToHuman({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id,
      reasonCode: forcedReason,
      reasonDetail: `تصعيد تلقائي: intent=${intent.intent}, sentiment=${intent.sentiment}`,
      lastCustomerMessage: input.messageText,
      conversationSummary: memory.summary,
      traceId,
    });
    return finish({
      reply: escalation.customerMessage,
      intent, handedOff: true, handoffReason: forcedReason, escalated: true,
      guardrail: { injectionVerdict: guard.verdict, groundingViolations: [], outputFilterReasons: [] },
    });
  }

  // ---- 4. Tool-calling loop ----------------------------------------------
  const toolCtx: ToolContext = {
    principal: customerPrincipal(tenant.id, customer.id),
    tenant,
    tenantId: tenant.id,
    customerId: customer.id,
    conversationId: conversation.id,
    traceId,
    locale: customer.locale,
  };

  const availableTools = toolsForContext(toolCtx);
  const llmTools = toLlmToolDefinitions(availableTools);

  const system = buildSystemPrompt({
    tenant,
    customerName: customer.name,
    isReturningCustomer: conversation.message_count > 1 || customer.first_seen_at < customer.last_seen_at,
    conversationSummary: memory.summary,
    intent: intent.intent,
    suspiciousInput: guard.verdict === 'suspicious',
    maxReplyChars: cfg.AGENT_MAX_REPLY_CHARS,
  });

  const messages: LlmMessage[] = [
    ...memory.history,
    { role: 'user', content: `${memory.customerCard ? `<customer_context>${memory.customerCard}</customer_context>\n` : ''}${wrapUntrusted(guard.sanitized)}` },
  ];

  let replyText = '';
  let escalatedByTool = false;
  let handoffReason: HandoffReason | null = null;
  let pendingEscalation: { reasonCode: HandoffReason; detail: string; priority?: 'low' | 'normal' | 'high' | 'urgent' } | null = null;

  try {
    for (let iteration = 0; iteration < cfg.AGENT_MAX_TOOL_ITERATIONS; iteration++) {
      const res = await complete({
        system,
        messages,
        tools: llmTools,
        maxTokens: cfg.LLM_MAX_TOKENS,
        temperature: cfg.LLM_TEMPERATURE,
      });

      model = res.model;
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
      usage.costUsd += estimateCostUsd(res.usage, res.model);

      if (res.toolCalls.length === 0) {
        replyText = res.text;
        break;
      }

      // Record the assistant turn (text + tool_use blocks) verbatim.
      const assistantBlocks: LlmContentBlock[] = [];
      if (res.text) assistantBlocks.push({ type: 'text', text: res.text });
      assistantBlocks.push(...res.toolCalls);
      messages.push({ role: 'assistant', content: assistantBlocks });

      const resultBlocks: LlmContentBlock[] = [];
      for (const call of res.toolCalls) {
        const { result, durationMs } = await executeTool(call.name, call.input, toolCtx);
        toolInvocations.push({ name: call.name, input: call.input, result, durationMs });

        if (call.name === 'handoff_to_human' && result.ok) {
          escalatedByTool = true;
          handoffReason = (call.input.reason_code as HandoffReason) ?? 'manual';
        }
        if (result.escalate && !pendingEscalation) {
          pendingEscalation = {
            reasonCode: result.escalate.reasonCode as HandoffReason,
            detail: result.escalate.detail ?? '',
            priority: result.escalate.priority,
          };
        }

        resultBlocks.push({
          type: 'tool_result',
          toolUseId: call.id,
          content: JSON.stringify(result.ok ? result.data : { error: result.error }),
          isError: !result.ok,
        });
      }
      messages.push({ role: 'user', content: resultBlocks });

      // The handoff tool ends the turn: its customer_message is the reply.
      if (escalatedByTool) {
        const handoffCall = toolInvocations.find((t) => t.name === 'handoff_to_human' && t.result.ok);
        const data = handoffCall?.result.ok ? (handoffCall.result.data as { customer_message?: string }) : null;
        replyText = data?.customer_message ?? 'حوّلت محادثتك لأحد الزملاء وبيتواصل معك قريب.';
        break;
      }
    }

    if (!replyText.trim()) {
      // Loop exhausted without a final answer — the model kept reaching for
      // tools. That is exactly the "not confident" case.
      throw new Error('agent produced no reply within the tool iteration budget');
    }
  } catch (err) {
    const info = toErrorInfo(err);
    log.error({ err: info, traceId }, 'agent turn failed');
    await writeAgentLog({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
      step: 'agent.generate', level: 'error', status: 'error', errorMessage: info.message,
      detail: { code: info.code, toolCalls: toolInvocations.map((t) => t.name) },
    });

    const escalation = await safeEscalate({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id,
      reasonCode: 'tool_failure',
      reasonDetail: `فشل تقني أثناء توليد الرد: ${info.message}`,
      lastCustomerMessage: input.messageText,
      conversationSummary: memory.summary,
      traceId,
    });

    return finish({
      reply: escalation ?? FALLBACK_REPLY,
      intent, handedOff: true, handoffReason: 'tool_failure', escalated: true,
      guardrail: { injectionVerdict: guard.verdict, groundingViolations: [], outputFilterReasons: ['llm_failure'] },
    });
  }

  // ---- 5. A tool asked us to escalate (e.g. a failed lookup) -------------
  if (pendingEscalation && !escalatedByTool) {
    const escalation = await safeEscalate({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id,
      reasonCode: pendingEscalation.reasonCode,
      reasonDetail: pendingEscalation.detail,
      priority: pendingEscalation.priority,
      lastCustomerMessage: input.messageText,
      conversationSummary: memory.summary,
      traceId,
    });
    return finish({
      reply: escalation ?? FALLBACK_REPLY,
      intent, handedOff: true, handoffReason: pendingEscalation.reasonCode, escalated: true,
      guardrail: { injectionVerdict: guard.verdict, groundingViolations: [], outputFilterReasons: ['tool_escalation'] },
    });
  }

  // ---- 6. Grounding ------------------------------------------------------
  const grounding = checkGrounding(replyText, toolInvocations);
  if (!grounding.grounded) {
    await writeAgentLog({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
      step: 'guardrail.blocked', level: 'warn', status: 'blocked',
      detail: { violations: grounding.violations, blockedReply: replyText.slice(0, 400) },
    });
    log.warn({ traceId, violations: grounding.violations }, 'reply blocked by grounding check');

    const escalation = await safeEscalate({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id,
      reasonCode: 'low_confidence',
      reasonDetail: `رد غير مدعوم ببيانات: ${grounding.violations.join(', ')}`,
      lastCustomerMessage: input.messageText,
      conversationSummary: memory.summary,
      traceId,
    });

    return finish({
      reply: escalation ?? 'ما حاب أعطيك معلومة غير مؤكدة، حوّلت سؤالك لأحد الزملاء وبيرد عليك قريب.',
      intent, handedOff: true, handoffReason: 'low_confidence', escalated: true,
      guardrail: { injectionVerdict: guard.verdict, groundingViolations: grounding.violations, outputFilterReasons: [] },
    });
  }

  // ---- 7. Outbound filter ------------------------------------------------
  const scan = scanOutboundText(replyText, { ownPhone: customer.phone, tenant });
  if (!scan.safe) {
    await writeAgentLog({
      tenantId: tenant.id, conversationId: conversation.id, customerId: customer.id, traceId,
      step: 'guardrail.outbound', level: 'warn', status: 'blocked',
      detail: { reasons: scan.reasons },
    });
  }

  const leaked = scan.reasons.some((r) => r.startsWith('system_prompt_leak'));
  const finalReply = leaked
    ? 'أقدر أساعدك في استفسارات المتجر والطلبات. كيف أقدر أخدمك؟'
    : trimReply(scan.text, cfg.AGENT_MAX_REPLY_CHARS);

  return finish({
    reply: finalReply,
    intent, handedOff: escalatedByTool, handoffReason, escalated: escalatedByTool,
    guardrail: { injectionVerdict: guard.verdict, groundingViolations: [], outputFilterReasons: scan.reasons },
  });

  // -------------------------------------------------------------------------

  function finish(partial: Omit<AgentTurnResult, 'toolInvocations' | 'usage' | 'model' | 'latencyMs'>): AgentTurnResult {
    return { ...partial, toolInvocations, usage, model, latencyMs: Date.now() - startedAt };
  }
}

/**
 * Escalation must never be the thing that breaks a turn. If the escalation
 * itself fails we still return a safe message and log loudly.
 */
async function safeEscalate(input: Parameters<typeof escalateToHuman>[0]): Promise<string | null> {
  try {
    const result = await escalateToHuman(input);
    return result.customerMessage;
  } catch (err) {
    logger().error({ err: toErrorInfo(err), traceId: input.traceId }, 'escalation failed');
    await writeAgentLog({
      tenantId: input.tenantId, conversationId: input.conversationId, customerId: input.customerId,
      traceId: input.traceId, step: 'handoff.failed', level: 'error', status: 'error',
      errorMessage: toErrorInfo(err).message,
    });
    return null;
  }
}

function forcedHandoffReason(intent: IntentResult, tenant: Tenant): HandoffReason | null {
  if (intentForcesHandoff(intent.intent, tenant.settings?.alwaysEscalateIntents ?? [])) {
    return intent.intent === 'talk_to_human' ? 'customer_request' : 'sensitive_issue';
  }
  // An angry customer goes to a person, whatever they are asking about.
  if (intent.sentiment === 'angry') return 'angry_customer';
  return null;
}

/** Keep replies WhatsApp-short; cut on a sentence boundary when possible. */
function trimReply(text: string, maxChars: number): string {
  const clean = text.trim().replace(/\n{3,}/g, '\n\n');
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('؟'), cut.lastIndexOf('!'), cut.lastIndexOf('\n'));
  return (lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : cut).trim();
}
