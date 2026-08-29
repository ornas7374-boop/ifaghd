import { env } from '../config/env.js';
import { logger } from '../observability/logger.js';
import { withRetry } from '../utils/retry.js';
import { toErrorInfo } from '../utils/errors.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAiProvider } from './providers/openai.js';
import { MockProvider } from './providers/mock.js';
import type { LlmCompletionRequest, LlmCompletionResponse, LlmProvider } from './types.js';

export * from './types.js';
export { MockProvider };

let provider: LlmProvider | null = null;

export function buildProvider(cfg = env()): LlmProvider {
  switch (cfg.LLM_PROVIDER) {
    case 'anthropic':
      return new AnthropicProvider(cfg.LLM_MODEL, cfg.ANTHROPIC_API_KEY!, cfg.ANTHROPIC_BASE_URL);
    case 'openai':
      return new OpenAiProvider(cfg.LLM_MODEL, cfg.OPENAI_API_KEY!, cfg.OPENAI_BASE_URL);
    case 'mock':
      return new MockProvider();
  }
}

export function llm(): LlmProvider {
  if (!provider) provider = buildProvider();
  return provider;
}

/** Injection point for tests and for per-tenant provider overrides. */
export function setProvider(p: LlmProvider | null): void {
  provider = p;
}

/**
 * The call every part of the agent should use: adds timeout, jittered retry on
 * transient upstream failures, and a one-shot fallback model. A dead LLM must
 * surface as a clean throw so the pipeline can escalate to a human rather than
 * hang the conversation.
 */
export async function complete(req: LlmCompletionRequest): Promise<LlmCompletionResponse> {
  const cfg = env();
  const p = llm();
  const log = logger();

  const run = (model?: string) =>
    withRetry(
      () => p.complete({ ...req, model: model ?? req.model, timeoutMs: req.timeoutMs ?? cfg.LLM_TIMEOUT_MS }),
      {
        attempts: cfg.LLM_MAX_RETRIES + 1,
        baseDelayMs: 400,
        maxDelayMs: 4_000,
        isRetryable: (e) => toErrorInfo(e).retryable,
        onRetry: ({ attempt, delayMs, error }) =>
          log.warn({ attempt, delayMs, err: toErrorInfo(error) }, 'llm call failed, retrying'),
      },
    );

  try {
    return await run();
  } catch (err) {
    if (cfg.LLM_FALLBACK_MODEL && cfg.LLM_FALLBACK_MODEL !== (req.model ?? p.defaultModel)) {
      log.warn({ err: toErrorInfo(err), fallback: cfg.LLM_FALLBACK_MODEL }, 'primary model failed, trying fallback');
      return await run(cfg.LLM_FALLBACK_MODEL);
    }
    throw err;
  }
}

export function estimateCostUsd(usage: { inputTokens: number; outputTokens: number }, model: string): number {
  return llm().estimateCostUsd(usage, model);
}
