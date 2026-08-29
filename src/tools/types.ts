import type { z } from 'zod';
import type { Principal } from '../security/authz.js';
import type { Capability } from '../security/authz.js';
import type { Tenant } from '../db/types.js';

/**
 * Everything a tool is allowed to know. Note that tenantId and customerId
 * come from here — the trusted session — and never from the model's arguments.
 */
export interface ToolContext {
  principal: Principal;
  tenant: Tenant;
  tenantId: string;
  customerId: string | null;
  conversationId: string | null;
  traceId: string;
  locale: string;
}

export interface ToolSuccess<T = unknown> {
  ok: true;
  data: T;
  /** Set when the tool wants the pipeline to escalate after this turn. */
  escalate?: { reasonCode: string; detail?: string; priority?: 'low' | 'normal' | 'high' | 'urgent' };
}

export interface ToolFailure {
  ok: false;
  error: { code: string; message: string; retryable: boolean; details?: Record<string, unknown> };
  escalate?: { reasonCode: string; detail?: string; priority?: 'low' | 'normal' | 'high' | 'urgent' };
}

export type ToolResult<T = unknown> = ToolSuccess<T> | ToolFailure;

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  /** Shown to the model — describe when to use it and what it will NOT do. */
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  requiredCapabilities: Capability[];
  /** Read-only tools are safe to call speculatively; others need confirmation. */
  sideEffect: 'none' | 'creates_record' | 'notifies_human';
  timeoutMs?: number;
  handler: (input: TInput, ctx: ToolContext) => Promise<ToolResult<TOutput>>;
}

export interface ToolInvocation {
  name: string;
  input: Record<string, unknown>;
  result: ToolResult;
  durationMs: number;
}
