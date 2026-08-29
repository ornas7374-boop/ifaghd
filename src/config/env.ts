import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for configuration. The process refuses to boot with
 * an invalid config rather than failing later in front of a customer.
 */
const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase())));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    PUBLIC_BASE_URL: z.string().url().optional(),

    // ---- Database -------------------------------------------------------
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    DATABASE_SSL: bool.default(false),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

    // ---- LLM ------------------------------------------------------------
    // Swap providers here; no agent code changes required.
    LLM_PROVIDER: z.enum(['anthropic', 'openai', 'mock']).default('anthropic'),
    LLM_MODEL: z.string().default('claude-sonnet-4-5'),
    LLM_FALLBACK_MODEL: z.string().optional(),
    LLM_MAX_TOKENS: z.coerce.number().int().positive().default(700),
    LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.3),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),
    LLM_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_BASE_URL: z.string().url().default('https://api.anthropic.com'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),

    // ---- WhatsApp Cloud API --------------------------------------------
    WHATSAPP_VERIFY_TOKEN: z.string().min(1).default('change-me-verify-token'),
    WHATSAPP_APP_SECRET: z.string().optional(),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_API_VERSION: z.string().default('v21.0'),
    WHATSAPP_API_BASE_URL: z.string().url().default('https://graph.facebook.com'),
    WHATSAPP_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    // Reject webhooks whose signature does not verify. Keep true in production.
    WHATSAPP_REQUIRE_SIGNATURE: bool.default(true),

    // ---- Internal API (n8n <-> agent) ----------------------------------
    INTERNAL_API_KEY: z.string().min(16, 'INTERNAL_API_KEY must be at least 16 chars'),
    // When true the HTTP webhook only records the event and n8n drives the
    // pipeline step by step. When false the service answers by itself.
    WEBHOOK_DELEGATE_TO_N8N: bool.default(false),
    N8N_INBOUND_WEBHOOK_URL: z.string().url().optional(),

    // ---- Escalation notification ---------------------------------------
    HANDOFF_NOTIFY_CHANNEL: z.enum(['none', 'webhook', 'slack', 'whatsapp']).default('none'),
    HANDOFF_WEBHOOK_URL: z.string().url().optional(),
    HANDOFF_SLACK_WEBHOOK_URL: z.string().url().optional(),
    HANDOFF_WHATSAPP_TO: z.string().optional(),

    // ---- Agent behaviour ------------------------------------------------
    AGENT_HISTORY_LIMIT: z.coerce.number().int().min(2).max(50).default(10),
    AGENT_SUMMARY_EVERY: z.coerce.number().int().min(4).default(12),
    AGENT_MAX_TOOL_ITERATIONS: z.coerce.number().int().min(1).max(8).default(4),
    AGENT_MAX_REPLY_CHARS: z.coerce.number().int().min(80).default(900),

    // ---- Security -------------------------------------------------------
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(120),
    TRUST_PROXY: bool.default(true),
  })
  .superRefine((env, ctx) => {
    const need = (cond: boolean, path: string, message: string) => {
      if (cond) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    };
    need(env.LLM_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY, 'ANTHROPIC_API_KEY', 'required when LLM_PROVIDER=anthropic');
    need(env.LLM_PROVIDER === 'openai' && !env.OPENAI_API_KEY, 'OPENAI_API_KEY', 'required when LLM_PROVIDER=openai');
    need(
      env.NODE_ENV === 'production' && env.WHATSAPP_REQUIRE_SIGNATURE && !env.WHATSAPP_APP_SECRET,
      'WHATSAPP_APP_SECRET',
      'required in production when WHATSAPP_REQUIRE_SIGNATURE is on',
    );
    need(env.HANDOFF_NOTIFY_CHANNEL === 'webhook' && !env.HANDOFF_WEBHOOK_URL, 'HANDOFF_WEBHOOK_URL', 'required when HANDOFF_NOTIFY_CHANNEL=webhook');
    need(env.HANDOFF_NOTIFY_CHANNEL === 'slack' && !env.HANDOFF_SLACK_WEBHOOK_URL, 'HANDOFF_SLACK_WEBHOOK_URL', 'required when HANDOFF_NOTIFY_CHANNEL=slack');
    need(env.HANDOFF_NOTIFY_CHANNEL === 'whatsapp' && !env.HANDOFF_WHATSAPP_TO, 'HANDOFF_WHATSAPP_TO', 'required when HANDOFF_NOTIFY_CHANNEL=whatsapp');
  });

export type AppEnv = z.infer<typeof EnvSchema>;

let cached: AppEnv | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export function env(): AppEnv {
  if (!cached) cached = loadEnv();
  return cached;
}

/** Test helper: force re-read of process.env on next env() call. */
export function resetEnvCache(): void {
  cached = null;
}
