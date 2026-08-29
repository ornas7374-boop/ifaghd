/**
 * Provider-agnostic LLM contract. Everything above this file (agent, tools,
 * guardrails) is written against these types only — swapping Anthropic for
 * OpenAI or a self-hosted model is a config change, not a rewrite.
 */

export interface LlmTextBlock { type: 'text'; text: string }
export interface LlmToolUseBlock { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
export interface LlmToolResultBlock { type: 'tool_result'; toolUseId: string; content: string; isError?: boolean }

export type LlmContentBlock = LlmTextBlock | LlmToolUseBlock | LlmToolResultBlock;

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string | LlmContentBlock[];
}

export interface LlmToolDefinition {
  name: string;
  description: string;
  /** JSON Schema (draft-07 subset) describing the tool input. */
  inputSchema: Record<string, unknown>;
}

export interface LlmCompletionRequest {
  system: string;
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  /** Ask the model to emit a single JSON object (used by the classifier). */
  jsonMode?: boolean;
  timeoutMs?: number;
  model?: string;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmCompletionResponse {
  text: string;
  toolCalls: LlmToolUseBlock[];
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'other';
  usage: LlmUsage;
  model: string;
  raw?: unknown;
}

export interface LlmProvider {
  readonly name: string;
  readonly defaultModel: string;
  complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse>;
  /** Rough USD estimate for observability/billing. 0 when unknown. */
  estimateCostUsd(usage: LlmUsage, model: string): number;
}
