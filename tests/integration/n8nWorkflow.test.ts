import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import request from 'supertest';
import { ensureSchema, truncateAll, seedFixture, closePool } from '../helpers/testDb.js';
import { setProvider, MockProvider } from '../../src/llm/index.js';

/**
 * Contract test between the n8n workflows and this service.
 *
 * The workflows are JSON that n8n executes — nothing type-checks them. If a
 * route is renamed or removed, the only place that breaks is production, at
 * the moment a customer messages in. These tests fail instead.
 */

interface N8nNode {
  name: string;
  type: string;
  parameters: Record<string, unknown> & { url?: string; jsonBody?: string };
}
interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: Record<string, { main: Array<Array<{ node: string }>> }>;
}

let main: N8nWorkflow;
let handoff: N8nWorkflow;
let app: import('express').Express;

beforeAll(async () => {
  main = JSON.parse(await readFile('n8n/workflows/customer-service-agent.json', 'utf8')) as N8nWorkflow;
  handoff = JSON.parse(await readFile('n8n/workflows/human-handoff-notify.json', 'utf8')) as N8nWorkflow;
  await ensureSchema();
  const { createApp } = await import('../../src/api/app.js');
  app = createApp();
});
afterAll(async () => { setProvider(null); await closePool(); });
beforeEach(async () => { await truncateAll(); setProvider(new MockProvider()); });

/** Agent-API paths the workflows call, with the placeholders normalised. */
function agentApiPaths(wf: N8nWorkflow): Array<{ node: string; method: string; path: string }> {
  const out: Array<{ node: string; method: string; path: string }> = [];
  for (const node of wf.nodes) {
    if (node.type !== 'n8n-nodes-base.httpRequest') continue;
    const url = node.parameters.url ?? '';
    if (!url.includes('/internal/v1/')) continue;
    const path = url
      .slice(url.indexOf('/internal/v1/'))
      .replace(/\{\{[^}]*\}\}/g, ':param');
    out.push({ node: node.name, method: String(node.parameters.method ?? 'GET'), path });
  }
  return out;
}

describe('workflow files are structurally sound', () => {
  it.each([['main', () => main], ['handoff', () => handoff]])('%s workflow has no dangling wiring', (_label, get) => {
    const wf = get();
    const names = new Set(wf.nodes.map((n) => n.name));

    for (const [src, spec] of Object.entries(wf.connections)) {
      expect(names, `connection source ${src}`).toContain(src);
      for (const out of spec.main) {
        for (const c of out) expect(names, `connection target ${c.node}`).toContain(c.node);
      }
    }

    // Every $('Node') expression must name a node that exists.
    const refs = new Set([...JSON.stringify(wf).matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]!));
    for (const ref of refs) expect(names, `expression reference ${ref}`).toContain(ref);
  });

  it.each([['main', () => main], ['handoff', () => handoff]])('%s workflow wires both branches of every IF', (_label, get) => {
    const wf = get();
    for (const node of wf.nodes.filter((n) => n.type === 'n8n-nodes-base.if')) {
      const outputs = wf.connections[node.name]?.main ?? [];
      expect(outputs.length, `${node.name} outputs`).toBeGreaterThanOrEqual(2);
      expect(outputs[0]!.length, `${node.name} true branch`).toBeGreaterThan(0);
      expect(outputs[1]!.length, `${node.name} false branch`).toBeGreaterThan(0);
    }
  });

  it('acknowledges the webhook before doing any work', () => {
    // Meta retries any delivery it does not see ACKed within seconds.
    const first = main.connections['WhatsApp Webhook']!.main[0]![0]!.node;
    expect(first).toBe('Respond 200 (ACK)');
  });

  it('retries every call that talks to the agent service', () => {
    const httpNodes = main.nodes.filter(
      (n) => n.type === 'n8n-nodes-base.httpRequest' && String(n.parameters.url ?? '').includes('/internal/v1/'),
    ) as Array<N8nNode & { retryOnFail?: boolean; maxTries?: number }>;

    expect(httpNodes.length).toBeGreaterThan(0);
    for (const node of httpNodes) {
      expect(node.retryOnFail, `${node.name} retryOnFail`).toBe(true);
      expect(node.maxTries, `${node.name} maxTries`).toBeGreaterThanOrEqual(2);
    }
  });

  it('routes agent and send failures to an escalation, never to silence', () => {
    const failurePath = main.connections['AI Agent (Tools + Knowledge Base)']!.main;
    expect(failurePath[1]!.map((c) => c.node)).toContain('Build Failure Handoff');

    const sendPath = main.connections['Send WhatsApp Message']!.main;
    expect(sendPath[1]!.map((c) => c.node)).toContain('Build Failure Handoff');

    expect(main.connections['Build Failure Handoff']!.main[0]!.map((c) => c.node))
      .toContain('Escalate After Failure');
  });

  it('embeds no secrets — credentials come from n8n environment variables', () => {
    const blob = JSON.stringify([main, handoff]);
    expect(blob).not.toMatch(/sk-ant-|sk-proj-|EAA[A-Za-z0-9]{20}/);
    // The API key is only ever referenced, never inlined.
    for (const match of blob.matchAll(/"x-api-key",\s*"value":\s*"([^"]*)"/g)) {
      expect(match[1]).toContain('$env.');
    }
  });
});

describe('every endpoint the workflow calls exists', () => {
  it('lists the expected agent API calls', () => {
    const paths = agentApiPaths(main).map((p) => `${p.method} ${p.path}`).sort();
    expect(paths).toEqual([
      'GET /internal/v1/conversations/:param/context',
      'POST /internal/v1/agent/respond',
      'POST /internal/v1/handoffs',
      'POST /internal/v1/handoffs',
      'POST /internal/v1/intent/classify',
      'POST /internal/v1/messages/normalize',
      'POST /internal/v1/messages/send',
      'POST /internal/v1/messages/store',
      'POST /internal/v1/customers/identify',
    ].sort());
  });

  it('none of them 404s', async () => {
    const fx = await seedFixture();
    const key = 'test-internal-api-key-0123456789';

    // Use a real conversation: a "not found" 404 for a made-up id would mask
    // an actually-missing route, which is what this test exists to catch.
    const identified = await request(app).post('/internal/v1/customers/identify')
      .set('x-api-key', key)
      .send({ channel: 'whatsapp', channel_account_external_id: fx.channelAccountExternalId, phone: fx.customerPhone })
      .expect(200);
    const conversationId: string = identified.body.conversation.id;

    // Realistic minimal bodies; we assert only that the route is reachable and
    // authenticated, not that every payload is complete.
    const probes: Array<{ method: 'get' | 'post'; path: string; body?: unknown }> = [
      { method: 'post', path: '/internal/v1/messages/normalize', body: { channel: 'whatsapp', payload: { entry: [] } } },
      { method: 'post', path: '/internal/v1/customers/identify', body: { channel: 'whatsapp', channel_account_external_id: fx.channelAccountExternalId, phone: fx.customerPhone } },
      { method: 'post', path: '/internal/v1/intent/classify', body: { text: 'مرحبا' } },
      { method: 'post', path: '/internal/v1/agent/respond', body: { tenant_id: fx.tenantId, conversation_id: conversationId, message: 'مرحبا' } },
      { method: 'post', path: '/internal/v1/messages/send', body: { channel: 'whatsapp', to: fx.customerPhone, text: 'مرحبا' } },
      { method: 'post', path: '/internal/v1/messages/store', body: { tenant_id: fx.tenantId, conversation_id: conversationId, customer_id: fx.customerId, direction: 'outbound', role: 'agent', content: 'x' } },
      { method: 'post', path: '/internal/v1/handoffs', body: { tenant_id: fx.tenantId, conversation_id: conversationId, customer_id: fx.customerId, reason_code: 'manual' } },
      { method: 'get', path: `/internal/v1/conversations/${conversationId}/context?tenant_id=${fx.tenantId}` },
    ];

    for (const probe of probes) {
      const res = await (probe.method === 'get'
        ? request(app).get(probe.path).set('x-api-key', key)
        : request(app).post(probe.path).set('x-api-key', key).send(probe.body as object));

      expect(res.status, `${probe.method.toUpperCase()} ${probe.path} -> ${res.status}`).not.toBe(404);
      expect(res.status, `${probe.method.toUpperCase()} ${probe.path} auth`).not.toBe(401);
    }
  });

  it('sends the field name the workflow reads back from /messages/send', async () => {
    const fx = await seedFixture({ slug: 'send-shape' });
    const res = await request(app).post('/internal/v1/messages/send')
      .set('x-api-key', 'test-internal-api-key-0123456789')
      .send({ channel: 'whatsapp', to: fx.customerPhone, text: 'اختبار' });

    // WhatsApp is unconfigured in tests, so this fails — but the response
    // shape (snake_case) is what the Save Conversation node depends on.
    expect(res.body).toHaveProperty('external_message_id');
    expect(res.body).toHaveProperty('status');
  });
});
