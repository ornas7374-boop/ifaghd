import { httpJson } from '../../utils/http.js';
import { UpstreamError } from '../../utils/errors.js';
import type {
  LlmCompletionRequest, LlmCompletionResponse, LlmProvider, LlmToolUseBlock, LlmUsage,
} from '../types.js';

interface AnthropicBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicResponse {
  content: AnthropicBlock[];
  stop_reason: string | null;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

/** USD per 1M tokens. Update as pricing changes; only used for reporting. */
const PRICES: Record<string, { in: number; out: number }> = {
  'claude-opus-4-5': { in: 5, out: 25 },
  'claude-sonnet-4-5': { in: 3, out: 15 },
  'claude-haiku-4-5': { in: 1, out: 5 },
};

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';

  constructor(
    readonly defaultModel: string,
    private readonly apiKey: string,
    private readonly baseUrl = 'https://api.anthropic.com',
    private readonly apiVersion = '2023-06-01',
  ) {
    if (!apiKey) throw new Error('AnthropicProvider requires an API key');
  }

  async complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    const model = req.model ?? this.defaultModel;

    const body: Record<string, unknown> = {
      model,
      max_tokens: req.maxTokens ?? 700,
      temperature: req.temperature ?? 0.3,
      system: req.system,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string'
          ? m.content
          : m.content.map((b) => {
              if (b.type === 'text') return { type: 'text', text: b.text };
              if (b.type === 'tool_use') return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
              return { type: 'tool_result', tool_use_id: b.toolUseId, content: b.content, is_error: b.isError ?? false };
            }),
      })),
    };

    if (req.tools?.length) {
      body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
    }

    const res = await httpJson<AnthropicResponse>(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body,
      timeoutMs: req.timeoutMs ?? 25_000,
      label: 'anthropic messages',
    });

    if (!res?.content) throw new UpstreamError('anthropic returned no content', { retryable: true });

    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n').trim();
    const toolCalls: LlmToolUseBlock[] = res.content
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ type: 'tool_use', id: b.id!, name: b.name!, input: b.input ?? {} }));

    return {
      text,
      toolCalls,
      stopReason: mapStopReason(res.stop_reason),
      usage: { inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0 },
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

function mapStopReason(reason: string | null): LlmCompletionResponse['stopReason'] {
  switch (reason) {
    case 'end_turn': return 'end_turn';
    case 'tool_use': return 'tool_use';
    case 'max_tokens': return 'max_tokens';
    case 'stop_sequence': return 'stop_sequence';
    default: return 'other';
  }
}
