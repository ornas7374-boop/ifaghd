import { Router, type Request, type Response } from 'express';
import { env } from '../../config/env.js';
import { healthCheck } from '../../db/pool.js';
import { llm } from '../../llm/index.js';
import { listChannels } from '../../channels/registry.js';
import { listTools } from '../../tools/registry.js';

export const healthRouter = Router();

/** Liveness — is the process up. Used by the container runtime. */
healthRouter.get('/healthz', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime_seconds: Math.round(process.uptime()) });
});

/** Readiness — can we actually serve traffic (i.e. is the database reachable). */
healthRouter.get('/readyz', async (_req: Request, res: Response) => {
  const cfg = env();
  const database = await healthCheck();

  const whatsappConfigured = Boolean(cfg.WHATSAPP_ACCESS_TOKEN && cfg.WHATSAPP_PHONE_NUMBER_ID);
  const ready = database.ok;

  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not_ready',
    checks: {
      database,
      llm: { provider: cfg.LLM_PROVIDER, model: cfg.LLM_MODEL, configured: cfg.LLM_PROVIDER === 'mock' || Boolean(cfg.ANTHROPIC_API_KEY || cfg.OPENAI_API_KEY) },
      whatsapp: { configured: whatsappConfigured, signature_required: cfg.WHATSAPP_REQUIRE_SIGNATURE },
    },
  });
});

/** What this build can do — handy when debugging a deployment. */
healthRouter.get('/info', (_req: Request, res: Response) => {
  const cfg = env();
  res.json({
    service: 'ifaghd-cs-agent',
    environment: cfg.NODE_ENV,
    llm: { provider: llm().name, model: cfg.LLM_MODEL, fallback: cfg.LLM_FALLBACK_MODEL ?? null },
    channels: listChannels(),
    tools: listTools().map((t) => ({ name: t.name, side_effect: t.sideEffect, capabilities: t.requiredCapabilities })),
    agent: {
      history_limit: cfg.AGENT_HISTORY_LIMIT,
      summary_every: cfg.AGENT_SUMMARY_EVERY,
      max_tool_iterations: cfg.AGENT_MAX_TOOL_ITERATIONS,
      max_reply_chars: cfg.AGENT_MAX_REPLY_CHARS,
    },
    mode: cfg.WEBHOOK_DELEGATE_TO_N8N ? 'n8n_orchestrated' : 'self_contained',
  });
});
