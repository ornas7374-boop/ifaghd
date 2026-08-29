import type {
  LlmCompletionRequest, LlmCompletionResponse, LlmProvider, LlmToolUseBlock, LlmUsage,
} from '../types.js';

/**
 * Deterministic test double for the LLM — selected only via LLM_PROVIDER=mock.
 *
 * It exists so the pipeline (tools, guardrails, memory, handoff, persistence)
 * can be exercised in CI without an API key or network. It is NOT a fallback
 * for production: the config schema still requires a real key for the
 * anthropic/openai providers, and running with `mock` is visible in every
 * agent_logs row via the model name.
 *
 * The rules below are intentionally simple keyword routing; the point is to
 * produce a realistic tool_use → tool_result → text sequence.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock';
  readonly defaultModel = 'mock-1';

  /** Queue of scripted responses, used by unit tests that need exact output. */
  private scripted: Array<Partial<LlmCompletionResponse>> = [];
  readonly calls: LlmCompletionRequest[] = [];

  script(...responses: Array<Partial<LlmCompletionResponse>>): void {
    this.scripted.push(...responses);
  }

  reset(): void {
    this.scripted = [];
    this.calls.length = 0;
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    this.calls.push(req);

    const next = this.scripted.shift();
    if (next) {
      return {
        text: next.text ?? '',
        toolCalls: next.toolCalls ?? [],
        stopReason: next.stopReason ?? (next.toolCalls?.length ? 'tool_use' : 'end_turn'),
        usage: next.usage ?? { inputTokens: 100, outputTokens: 40 },
        model: next.model ?? this.defaultModel,
      };
    }

    return this.heuristic(req);
  }

  estimateCostUsd(_usage: LlmUsage, _model: string): number {
    return 0;
  }

  // -------------------------------------------------------------------------

  private heuristic(req: LlmCompletionRequest): LlmCompletionResponse {
    const usage = { inputTokens: 120, outputTokens: 45 };
    const lastUser = lastUserText(req);
    const toolNames = new Set((req.tools ?? []).map((t) => t.name));
    const alreadyCalled = calledToolNames(req);

    // Intent classification calls arrive in JSON mode with no tools.
    if (req.jsonMode) {
      return { text: JSON.stringify(classify(lastUser)), toolCalls: [], stopReason: 'end_turn', usage, model: this.defaultModel };
    }

    // Summarisation pass (no tools offered, prompt asks for a summary).
    if (!req.tools?.length && /summar|ملخص/i.test(req.system)) {
      return { text: `ملخص: ${lastUser.slice(0, 120)}`, toolCalls: [], stopReason: 'end_turn', usage, model: this.defaultModel };
    }

    const orderNumber = lastUser.match(/\b([A-Z]{2,}-\d{3,})\b/i)?.[1];

    if (/موظف|بشري|انسان|إنسان|human|agent|representative/i.test(lastUser) && toolNames.has('handoff_to_human') && !alreadyCalled.has('handoff_to_human')) {
      return this.toolCall('handoff_to_human', { reason_code: 'customer_request', reason_detail: lastUser.slice(0, 200), priority: 'high' }, usage);
    }

    if (orderNumber && toolNames.has('get_order_status') && !alreadyCalled.has('get_order_status')) {
      return this.toolCall('get_order_status', { order_number: orderNumber }, usage);
    }

    if (/طلب|اوردر|أوردر|order|شحن|توصيل/i.test(lastUser) && toolNames.has('get_order_status') && !alreadyCalled.has('get_order_status')) {
      return this.toolCall('get_order_status', {}, usage);
    }

    if (/سعر|كم|price|بكم/i.test(lastUser) && toolNames.has('search_products') && !alreadyCalled.has('search_products')) {
      const q = lastUser.replace(/[؟?]/g, '').replace(/^(كم سعر|بكم|سعر)\s*/i, '').trim();
      return this.toolCall('search_products', { query: q.slice(0, 60) || 'منتج' }, usage);
    }

    if (toolNames.has('search_knowledge_base') && !alreadyCalled.has('search_knowledge_base')) {
      return this.toolCall('search_knowledge_base', { query: lastUser.slice(0, 120) }, usage);
    }

    // Nothing else to do: answer from whatever the tools returned.
    const grounding = lastToolResultText(req);
    const text = grounding
      ? `${firstUsefulLine(grounding)}`
      : 'أبشر، خلني أتأكد لك من المعلومة وأرجع لك.';
    return { text, toolCalls: [], stopReason: 'end_turn', usage, model: this.defaultModel };
  }

  private toolCall(name: string, input: Record<string, unknown>, usage: LlmUsage): LlmCompletionResponse {
    const call: LlmToolUseBlock = { type: 'tool_use', id: `mock_${name}_${this.calls.length}`, name, input };
    return { text: '', toolCalls: [call], stopReason: 'tool_use', usage, model: this.defaultModel };
  }
}

/**
 * Pull out the customer's actual words. A real model reads past the
 * <customer_context> card and the <customer_message> wrapper to the question
 * itself, so the double must too — otherwise it feeds prompt scaffolding into
 * tool queries and the resulting test signal is meaningless.
 */
function lastUserText(req: LlmCompletionRequest): string {
  for (let i = req.messages.length - 1; i >= 0; i--) {
    const m = req.messages[i]!;
    if (m.role !== 'user') continue;
    const raw =
      typeof m.content === 'string'
        ? m.content
        : m.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join(' ');
    if (!raw.trim()) continue;

    const wrapped = [...raw.matchAll(/<customer_message>([\s\S]*?)<\/customer_message>/g)];
    if (wrapped.length) return wrapped[wrapped.length - 1]![1]!.trim();
    return raw.replace(/<customer_context>[\s\S]*?<\/customer_context>/g, '').trim();
  }
  return '';
}

function calledToolNames(req: LlmCompletionRequest): Set<string> {
  const names = new Set<string>();
  for (const m of req.messages) {
    if (typeof m.content === 'string') continue;
    for (const b of m.content) if (b.type === 'tool_use') names.add(b.name);
  }
  return names;
}

function lastToolResultText(req: LlmCompletionRequest): string | null {
  for (let i = req.messages.length - 1; i >= 0; i--) {
    const m = req.messages[i]!;
    if (typeof m.content === 'string') continue;
    for (const b of m.content) if (b.type === 'tool_result' && !b.isError) return b.content;
  }
  return null;
}

function firstUsefulLine(json: string): string {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed.customer_message === 'string') return parsed.customer_message;
    if (typeof parsed.answer === 'string') return parsed.answer;
    if (Array.isArray(parsed.results) && parsed.results.length) {
      const first = parsed.results[0] as Record<string, unknown>;
      if (typeof first.answer === 'string') return first.answer;
      if (first.name && first.price) return `${first.name} سعره ${first.price} ${first.currency ?? 'ريال'}.`;
    }
    if (typeof parsed.status_label === 'string') return `حالة طلبك: ${parsed.status_label}`;
  } catch { /* fall through */ }
  return 'تم، أفدتك بالمعلومة المتوفرة عندي.';
}

function classify(text: string): Record<string, unknown> {
  const rules: Array<[RegExp, string]> = [
    [/موظف|بشري|انسان|إنسان|human/i, 'talk_to_human'],
    [/ارجاع|إرجاع|استرجاع|refund|return/i, 'return_request'],
    [/استبدال|تبديل|exchange/i, 'exchange_request'],
    [/شكوى|زعلان|سيء|تعبت|مقهور|complaint/i, 'complaint'],
    [/سعر|بكم|كم سعر|price/i, 'price_question'],
    [/شحن|توصيل|متى يوصل|shipping|delivery/i, 'shipping_question'],
    [/طلبي|طلبية|اوردر|أوردر|order/i, 'order_issue'],
    [/منتج|متوفر|مقاس|لون|product/i, 'product_inquiry'],
    [/سلام|هلا|مرحبا|هاي|صباح|مساء/i, 'greeting'],
  ];
  for (const [re, intent] of rules) {
    if (re.test(text)) {
      return { intent, confidence: 0.8, sentiment: /زعلان|سيء|مقهور|غاضب/i.test(text) ? 'angry' : 'neutral', language: 'ar' };
    }
  }
  return { intent: 'other', confidence: 0.4, sentiment: 'neutral', language: 'ar' };
}
