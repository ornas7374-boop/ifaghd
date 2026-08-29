import { env } from '../config/env.js';
import { getMessagesSinceSummary, getRecentMessages, updateConversation } from '../db/repositories/conversations.js';
import { writeAgentLog } from '../db/repositories/logs.js';
import { complete } from '../llm/index.js';
import { logger } from '../observability/logger.js';
import { toErrorInfo } from '../utils/errors.js';
import { buildSummaryPrompt } from './prompts/systemPrompt.js';
import { wrapUntrusted } from '../security/promptGuard.js';
import type { Conversation, Customer, Message } from '../db/types.js';
import type { LlmMessage } from '../llm/types.js';

export interface ConversationMemory {
  /** Last N turns, formatted for the LLM. */
  history: LlmMessage[];
  summary: string | null;
  customerCard: string;
  messagesConsidered: number;
}

/**
 * Three-layer memory, sized to keep per-message cost flat as a conversation
 * grows:
 *   1. a compact customer card (identity + order count),
 *   2. a rolling summary of everything older than the window,
 *   3. the last N raw turns.
 * The full history is never sent, no matter how long the chat runs.
 */
export async function loadMemory(params: {
  conversation: Conversation;
  customer: Customer;
  historyLimit?: number;
}): Promise<ConversationMemory> {
  const cfg = env();
  const limit = params.historyLimit ?? cfg.AGENT_HISTORY_LIMIT;
  const messages = await getRecentMessages(params.conversation.id, limit);

  return {
    history: toLlmMessages(messages),
    summary: params.conversation.summary,
    customerCard: buildCustomerCard(params.customer, params.conversation),
    messagesConsidered: messages.length,
  };
}

/**
 * Convert stored messages to LLM turns. Customer text is wrapped in
 * <customer_message> so the model treats it as data, matching the rule in the
 * system prompt. Consecutive same-role turns are merged because both
 * providers reject alternating-role violations.
 */
export function toLlmMessages(messages: Message[]): LlmMessage[] {
  const out: LlmMessage[] = [];

  for (const m of messages) {
    if (m.role === 'system') continue;
    const role: 'user' | 'assistant' = m.direction === 'inbound' ? 'user' : 'assistant';
    const content = role === 'user' ? wrapUntrusted(m.content) : m.content;

    const prev = out[out.length - 1];
    if (prev && prev.role === role && typeof prev.content === 'string') {
      prev.content = `${prev.content}\n${content}`;
    } else {
      out.push({ role, content });
    }
  }

  // Providers require the first turn to be a user turn.
  while (out.length && out[0]!.role !== 'user') out.shift();
  return out;
}

function buildCustomerCard(customer: Customer, conversation: Conversation): string {
  const lines = [
    customer.name ? `الاسم: ${customer.name}` : 'الاسم: غير معروف',
    `عميل منذ: ${new Date(customer.first_seen_at).toISOString().slice(0, 10)}`,
    `عدد رسائل هذه المحادثة: ${conversation.message_count}`,
  ];
  if (customer.tags.length) lines.push(`تصنيفات: ${customer.tags.join('، ')}`);
  return lines.join(' | ');
}

/**
 * Fold older turns into the rolling summary once the conversation outgrows the
 * window. Runs after the reply is sent, so it never adds latency to a customer
 * waiting on an answer.
 */
export async function maybeUpdateSummary(params: {
  conversation: Conversation;
  traceId: string;
  force?: boolean;
}): Promise<string | null> {
  const cfg = env();
  const { conversation } = params;
  const unsummarized = conversation.message_count - conversation.summary_message_count;

  if (!params.force && unsummarized < cfg.AGENT_SUMMARY_EVERY) return null;

  const started = Date.now();
  try {
    const messages = await getMessagesSinceSummary(conversation.id, conversation.summary_message_count, 60);
    if (messages.length < 2) return null;

    const transcript = messages
      .map((m) => `${m.role === 'customer' ? 'العميل' : m.role === 'human' ? 'الموظف' : 'الوكيل'}: ${m.content}`)
      .join('\n')
      .slice(0, 8000);

    const res = await complete({
      system: buildSummaryPrompt(),
      messages: [
        {
          role: 'user',
          content:
            (conversation.summary ? `الملخص السابق:\n${conversation.summary}\n\n` : '') +
            `الرسائل الجديدة:\n${transcript}`,
        },
      ],
      maxTokens: 300,
      temperature: 0.2,
    });

    const summary = res.text.trim().slice(0, 1500);
    if (!summary) return null;

    await updateConversation(conversation.tenant_id, conversation.id, {
      summary,
      summaryMessageCount: conversation.summary_message_count + messages.length,
    });

    await writeAgentLog({
      tenantId: conversation.tenant_id,
      conversationId: conversation.id,
      traceId: params.traceId,
      step: 'memory.summarized',
      durationMs: Date.now() - started,
      model: res.model,
      tokensIn: res.usage.inputTokens,
      tokensOut: res.usage.outputTokens,
      detail: { messagesFolded: messages.length, summaryChars: summary.length },
    });

    return summary;
  } catch (err) {
    // A failed summary just means a slightly larger window next turn.
    logger().warn({ err: toErrorInfo(err), conversationId: conversation.id }, 'summary update failed');
    await writeAgentLog({
      tenantId: conversation.tenant_id,
      conversationId: conversation.id,
      traceId: params.traceId,
      step: 'memory.summarized',
      level: 'warn',
      status: 'error',
      errorMessage: toErrorInfo(err).message,
    });
    return null;
  }
}
