import { z } from 'zod';
import { writeAgentLog } from '../db/repositories/logs.js';
import { logger } from '../observability/logger.js';
import { withTimeout } from '../utils/retry.js';
import { toErrorInfo, ForbiddenError } from '../utils/errors.js';
import { zodToJsonSchema } from './jsonSchema.js';
import { getCustomerTool } from './customerTools.js';
import { getOrderStatusTool, getOrderTool } from './orderTools.js';
import { searchProductsTool, getProductPriceTool } from './productTools.js';
import { searchKnowledgeBaseTool } from './kbTools.js';
import { createSupportTicketTool } from './supportTools.js';
import { handoffToHumanTool } from './handoffTools.js';
import type { LlmToolDefinition } from '../llm/types.js';
import type { ToolContext, ToolDefinition, ToolResult } from './types.js';

export * from './types.js';

const ALL_TOOLS: ToolDefinition<never, never>[] = [
  getCustomerTool,
  getOrderStatusTool,
  getOrderTool,
  searchProductsTool,
  getProductPriceTool,
  searchKnowledgeBaseTool,
  createSupportTicketTool,
  handoffToHumanTool,
] as unknown as ToolDefinition<never, never>[];

const BY_NAME = new Map(ALL_TOOLS.map((t) => [t.name, t]));

export function listTools(): ToolDefinition<never, never>[] {
  return [...ALL_TOOLS];
}

export function getTool(name: string): ToolDefinition<never, never> | undefined {
  return BY_NAME.get(name);
}

/**
 * Tools offered to the model for a given turn: only those the principal has
 * the capabilities for, minus anything the tenant disabled in settings. A tool
 * the model was never shown cannot be called.
 */
export function toolsForContext(ctx: ToolContext): ToolDefinition<never, never>[] {
  const disabled = new Set(ctx.tenant.settings?.disabledTools ?? []);
  return ALL_TOOLS.filter(
    (t) => !disabled.has(t.name) && t.requiredCapabilities.every((c) => ctx.principal.capabilities.has(c)),
  );
}

export function toLlmToolDefinitions(tools: ToolDefinition<never, never>[]): LlmToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.inputSchema as z.ZodTypeAny),
  }));
}

const DEFAULT_TOOL_TIMEOUT_MS = 12_000;

/**
 * Execute one tool call from the model.
 *
 * Every failure mode returns a structured ToolFailure rather than throwing,
 * because the agent loop needs to hand the model a tool_result either way —
 * an unanswered tool call leaves the conversation stuck.
 */
export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<{ result: ToolResult; durationMs: number }> {
  const started = Date.now();
  const log = logger();
  const tool = BY_NAME.get(name);

  const fail = async (
    code: string,
    message: string,
    opts: { retryable?: boolean; details?: Record<string, unknown>; escalate?: ToolResult extends { escalate?: infer E } ? E : never } = {},
  ): Promise<{ result: ToolResult; durationMs: number }> => {
    const durationMs = Date.now() - started;
    await writeAgentLog({
      tenantId: ctx.tenantId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      traceId: ctx.traceId,
      step: `tool.${name}`,
      level: 'warn',
      status: 'error',
      errorMessage: message,
      durationMs,
      detail: { code, input: redactInput(rawInput), ...(opts.details ?? {}) },
    });
    return {
      result: { ok: false, error: { code, message, retryable: opts.retryable ?? false, details: opts.details }, ...(opts.escalate ? { escalate: opts.escalate } : {}) },
      durationMs,
    };
  };

  if (!tool) {
    return fail('unknown_tool', `No tool named "${name}" exists.`);
  }

  // Capability gate — belt and braces alongside toolsForContext().
  const missing = tool.requiredCapabilities.filter((c) => !ctx.principal.capabilities.has(c));
  if (missing.length) {
    return fail('forbidden', `This action is not permitted in this conversation.`, { details: { missing } });
  }

  if (ctx.tenant.settings?.disabledTools?.includes(name)) {
    return fail('tool_disabled', `The ${name} tool is disabled for this account.`);
  }

  const parsed = (tool.inputSchema as z.ZodTypeAny).safeParse(rawInput ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    return fail('invalid_input', `Invalid arguments: ${issues.join('; ')}`, { details: { issues } });
  }

  try {
    const result = await withTimeout(
      tool.handler(parsed.data as never, ctx),
      tool.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS,
      `tool ${name}`,
    );

    // Validate what we hand back to the model, so a repository change cannot
    // silently start leaking extra columns into the prompt.
    if (result.ok) {
      const out = (tool.outputSchema as z.ZodTypeAny).safeParse(result.data);
      if (!out.success) {
        log.error({ tool: name, issues: out.error.issues }, 'tool output failed its own schema');
        return fail('invalid_output', 'The tool returned data in an unexpected shape.', {
          details: { issues: out.error.issues.map((i) => i.message) },
          escalate: { reasonCode: 'tool_failure', detail: `${name} returned malformed data`, priority: 'high' } as never,
        });
      }
      result.data = out.data as never;
    }

    const durationMs = Date.now() - started;
    await writeAgentLog({
      tenantId: ctx.tenantId,
      conversationId: ctx.conversationId,
      customerId: ctx.customerId,
      traceId: ctx.traceId,
      step: `tool.${name}`,
      status: result.ok ? 'ok' : 'error',
      durationMs,
      detail: { input: redactInput(parsed.data), ok: result.ok, summary: summarize(result) },
    });

    return { result, durationMs };
  } catch (err) {
    const info = toErrorInfo(err);
    log.error({ err: info, tool: name }, 'tool execution threw');

    if (err instanceof ForbiddenError) {
      return fail('forbidden', 'This action is not permitted in this conversation.', { details: info.details });
    }
    return fail(info.code, info.message, {
      retryable: info.retryable,
      details: info.details,
      // A crashed data lookup must never become a guessed answer.
      escalate: { reasonCode: 'tool_failure', detail: `${name} failed: ${info.message}`, priority: 'high' } as never,
    });
  }
}

/** Compact result summary for logs — never store full tool payloads. */
function summarize(result: ToolResult): Record<string, unknown> {
  if (!result.ok) return { error: result.error.code };
  const d = result.data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object') return {};
  const keys: Record<string, unknown> = {};
  for (const k of ['found', 'count', 'created', 'handed_off', 'ticket_number', 'order_number', 'status']) {
    if (k in d) keys[k] = d[k];
  }
  return keys;
}

function redactInput(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const clone: Record<string, unknown> = { ...(input as Record<string, unknown>) };
  for (const k of Object.keys(clone)) {
    const v = clone[k];
    if (typeof v === 'string' && v.length > 300) clone[k] = `${v.slice(0, 300)}…`;
  }
  return clone;
}
