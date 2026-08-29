import { httpJson } from '../../utils/http.js';
import { UpstreamError } from '../../utils/errors.js';
import type {
  LlmCompletionRequest, LlmCompletionResponse, LlmMessage, LlmProvider, LlmToolUseBlock, LlmUsage,
} from '../types.js';

interface OpenAiChoice {
  message: {
    content: string | null;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  };
  finish_reason: string | null;
}

interface OpenAiResponse {
  choices: OpenAiChoice[];
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

const PRICES: Record<string, { in: number; out: number }> = {
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4.1': { in: 2, out: 8 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
};

/**
 * Second provider, present to prove the abstraction holds — the agent code is
 * identical whichever of these is configured.
 */
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';

  constructor(
    readonly defaultModel: string,
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.openai.com/v1',
  ) {
    if (!apiKey) throw new Error('OpenAiProvider requires an API key');
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const model = req.model ?? this.defaultModel;
    const messages: Array<Record<string, unknown>> = [{ role: 'system', content: req.system }];

    for (const m of req.messages) messages.push(...toOpenAiMessages(m));

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: req.maxTokens ?? 700,
      temperature: req.temperature ?? 0.3,
    };
    if (req.jsonMode) body.response_format = { type: 'json_object' };
    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.inputSchema },
      }));
    }

    const res = await httpJson<OpenAiResponse>(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}` },
      body,
      timeoutMs: req.timeoutMs ?? 25_000,
      label: 'openai chat completions',
    });

    const choice = res?.choices?.[0];
    if (!choice) throw new UpstreamError('openai returned no choices', { retryable: true });

    const toolCalls: LlmToolUseBlock[] = (choice.message.tool_calls ?? []).map((c) => ({
      type: 'tool_use',
      id: c.id,
      name: c.function.name,
      input: safeJsonObject(c.function.arguments),
    }));

    return {
      text: (choice.message.content ?? '').trim(),
      toolCalls,
      stopReason: choice.finish_reason === 'tool_calls' ? 'tool_use'
        : choice.finish_reason === 'length' ? 'max_tokens'
        : choice.finish_reason === 'stop' ? 'end_turn' : 'other',
      usage: { inputTokens: res.usage?.prompt_tokens ?? 0, outputTokens: res.usage?.completion_tokens ?? 0 },
      model: res.model ?? model,
    };
  }

  estimateCostUsd(usage: LlmUsage, model: string): number {
    const key = Object.keys(PRICES).find((k) => model.startsWith(k));
    if (!key) return 0;
    const p = PRICES[key]!;
    return (usage.inputTokens / 1e6) * p.in + (usage.outputTokens / 1e6) * p.out;
  }
}

/**
 * Anthropic packs tool results into a user turn; OpenAI needs separate
 * `tool` role messages. This is the only place that difference leaks.
 */
function toOpenAiMessages(m: LlmMessage): Array<Record<string, unknown>> {
  if (typeof m.content === 'string') return [{ role: m.role, content: m.content }];

  const out: Array<Record<string, unknown>> = [];
  const textParts: string[] = [];
  const toolCalls: Array<Record<string, unknown>> = [];
  const toolResults: Array<Record<string, unknown>> = [];

  for (const block of m.content) {
    if (block.type === 'text') textParts.push(block.text);
    else if (block.type === 'tool_use') {
      toolCalls.push({ id: block.id, type: 'function', function: { name: block.name, arguments: JSON.stringify(block.input) } });
    } else {
      toolResults.push({ role: 'tool', tool_call_id: block.toolUseId, content: block.content });
    }
  }

  if (m.role === 'assistant' && (textParts.length || toolCalls.length)) {
    out.push({
      role: 'assistant',
      content: textParts.join('\n') || null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    });
  } else if (textParts.length) {
    out.push({ role: m.role, content: textParts.join('\n') });
  }
  out.push(...toolResults);
  return out;
}

function safeJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
