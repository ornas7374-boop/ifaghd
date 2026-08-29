import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import { ensureSchema, truncateAll, seedFixture, closePool, query, type TestFixture } from '../helpers/testDb.js';
import { setProvider, MockProvider } from '../../src/llm/index.js';
import { resetEnvCache } from '../../src/config/env.js';

const API_KEY = 'test-internal-api-key-0123456789';
let fx: TestFixture;
let app: import('express').Express;

beforeAll(async () => {
  await ensureSchema();
  const { createApp } = await import('../../src/api/app.js');
  app = createApp();
});
afterAll(async () => { setProvider(null); await closePool(); });

beforeEach(async () => {
  await truncateAll();
  fx = await seedFixture();
  setProvider(new MockProvider());
});

const auth = (r: request.Test) => r.set('x-api-key', API_KEY);

describe('health endpoints', () => {
  it('reports liveness', async () => {
    const res = await request(app).get('/healthz').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('reports readiness with a database check', async () => {
    const res = await request(app).get('/readyz').expect(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database.ok).toBe(true);
  });

  it('lists the tools and channels this build exposes', async () => {
    const res = await request(app).get('/info').expect(200);
    expect(res.body.channels).toContain('whatsapp');
    expect(res.body.tools.map((t: { name: string }) => t.name)).toContain('handoff_to_human');
  });
});

describe('internal API authentication', () => {
  it('rejects a request with no key', async () => {
    await request(app).post('/internal/v1/intent/classify').send({ text: 'هلا' }).expect(401);
  });

  it('rejects a wrong key', async () => {
    await request(app).post('/internal/v1/intent/classify')
      .set('x-api-key', 'wrong-key-wrong-key').send({ text: 'هلا' }).expect(401);
  });

  it('accepts the key as a bearer token too', async () => {
    await request(app).post('/internal/v1/intent/classify')
      .set('authorization', `Bearer ${API_KEY}`).send({ text: 'هلا' }).expect(200);
  });
});

describe('WhatsApp webhook verification handshake', () => {
  it('echoes the challenge when the token matches', async () => {
    const res = await request(app)
      .get('/webhook/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': '1234567890' })
      .expect(200);
    expect(res.text).toBe('1234567890');
  });

  it('rejects a wrong verify token', async () => {
    await request(app).get('/webhook/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'nope', 'hub.challenge': '123' })
      .expect(403);
  });
});

describe('WhatsApp webhook signature enforcement', () => {
  /**
   * Signature checking is disabled in the test env by default, so this suite
   * builds a second app with it on — the production posture must be covered.
   */
  async function appWithSignatures() {
    process.env.WHATSAPP_REQUIRE_SIGNATURE = 'true';
    resetEnvCache();
    const { createApp } = await import('../../src/api/app.js');
    const strict = createApp();
    return {
      strict,
      restore: () => { process.env.WHATSAPP_REQUIRE_SIGNATURE = 'false'; resetEnvCache(); },
    };
  }

  it('rejects an unsigned webhook', async () => {
    const { strict, restore } = await appWithSignatures();
    try {
      await request(strict).post('/webhook/whatsapp')
        .set('content-type', 'application/json')
        .send({ object: 'whatsapp_business_account', entry: [] })
        .expect(401);
    } finally { restore(); }
  });

  it('rejects a tampered body', async () => {
    const { strict, restore } = await appWithSignatures();
    try {
      const signedFor = JSON.stringify({ object: 'a' });
      const signature = `sha256=${createHmac('sha256', 'test-app-secret').update(signedFor).digest('hex')}`;
      await request(strict).post('/webhook/whatsapp')
        .set('content-type', 'application/json')
        .set('x-hub-signature-256', signature)
        .send(JSON.stringify({ object: 'tampered' }))
        .expect(401);
    } finally { restore(); }
  });

  it('accepts a correctly signed body', async () => {
    const { strict, restore } = await appWithSignatures();
    try {
      const raw = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
      const signature = `sha256=${createHmac('sha256', 'test-app-secret').update(raw).digest('hex')}`;
      await request(strict).post('/webhook/whatsapp')
        .set('content-type', 'application/json')
        .set('x-hub-signature-256', signature)
        .send(raw)
        .expect(200);
    } finally { restore(); }
  });
});

describe('internal API — n8n pipeline steps', () => {
  it('normalises a raw Meta payload into channel-neutral messages', async () => {
    const res = await auth(request(app).post('/internal/v1/messages/normalize')).send({
      channel: 'whatsapp',
      payload: {
        entry: [{ changes: [{ value: {
          metadata: { phone_number_id: fx.channelAccountExternalId },
          contacts: [{ wa_id: fx.customerPhone, profile: { name: 'سعود' } }],
          messages: [{ id: 'wamid.X', from: fx.customerPhone, type: 'text', text: { body: 'وين طلبي؟' } }],
        } }] }],
      },
    }).expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.messages[0]).toMatchObject({ phone: fx.customerPhone, text: 'وين طلبي؟', name: 'سعود' });
  });

  it('identifies the customer and resolves the tenant from the channel account', async () => {
    const res = await auth(request(app).post('/internal/v1/customers/identify')).send({
      channel: 'whatsapp',
      channel_account_external_id: fx.channelAccountExternalId,
      phone: fx.customerPhone,
      name: 'سعود',
    }).expect(200);

    expect(res.body.tenant.id).toBe(fx.tenantId);
    expect(res.body.customer.id).toBe(fx.customerId);
    expect(res.body.conversation.id).toBeTruthy();
  });

  it('404s for an unmapped channel account', async () => {
    await auth(request(app).post('/internal/v1/customers/identify')).send({
      channel: 'whatsapp', channel_account_external_id: 'UNKNOWN', phone: fx.customerPhone,
    }).expect(404);
  });

  it('classifies intent', async () => {
    const res = await auth(request(app).post('/internal/v1/intent/classify'))
      .send({ text: 'ابغى اكلم موظف' }).expect(200);
    expect(res.body.intent).toBe('talk_to_human');
  });

  it('runs a turn and returns the reply without sending it', async () => {
    const identify = await auth(request(app).post('/internal/v1/customers/identify')).send({
      channel: 'whatsapp', channel_account_external_id: fx.channelAccountExternalId, phone: fx.customerPhone,
    }).expect(200);

    const res = await auth(request(app).post('/internal/v1/agent/respond')).send({
      tenant_id: fx.tenantId,
      conversation_id: identify.body.conversation.id,
      message: 'كم رسوم الشحن؟',
    }).expect(200);

    expect(res.body.skipped).toBe(false);
    expect(res.body.reply).toBeTruthy();
    expect(res.body.usage).toHaveProperty('inputTokens');
  });

  it('declines to answer a conversation a human has taken over', async () => {
    const identify = await auth(request(app).post('/internal/v1/customers/identify')).send({
      channel: 'whatsapp', channel_account_external_id: fx.channelAccountExternalId, phone: fx.customerPhone,
    }).expect(200);

    await query(`UPDATE conversations SET handled_by = 'human' WHERE id = $1`, [identify.body.conversation.id]);

    const res = await auth(request(app).post('/internal/v1/agent/respond')).send({
      tenant_id: fx.tenantId, conversation_id: identify.body.conversation.id, message: 'في أحد؟',
    }).expect(200);

    expect(res.body).toMatchObject({ skipped: true, reason: 'human_handling' });
  });

  it('runs the whole pipeline in one call', async () => {
    const res = await auth(request(app).post('/internal/v1/process')).send({
      channel_account_external_id: fx.channelAccountExternalId,
      external_message_id: 'wamid.PROC1',
      phone: fx.customerPhone,
      text: 'كم رسوم الشحن؟',
      skip_send: true,
    }).expect(200);

    expect(['replied', 'escalated']).toContain(res.body.outcome);
    expect(res.body.trace_id).toBeTruthy();
    expect(res.body.conversation_id).toBeTruthy();
  });

  it('returns the conversation context for the memory step', async () => {
    const process = await auth(request(app).post('/internal/v1/process')).send({
      channel_account_external_id: fx.channelAccountExternalId,
      external_message_id: 'wamid.CTX1', phone: fx.customerPhone, text: 'هلا', skip_send: true,
    }).expect(200);

    const res = await auth(
      request(app).get(`/internal/v1/conversations/${process.body.conversation_id}/context`).query({ tenant_id: fx.tenantId }),
    ).expect(200);

    expect(res.body.recent_messages.length).toBeGreaterThan(0);
    expect(res.body.customer_card).toContain('سعود');
  });

  it('rejects a malformed body with field-level detail', async () => {
    const res = await auth(request(app).post('/internal/v1/agent/respond'))
      .send({ tenant_id: 'not-a-uuid', conversation_id: 'nope', message: '' }).expect(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details.issues.length).toBeGreaterThan(0);
  });
});

describe('internal API — handoffs and knowledge base', () => {
  it('creates a handoff and lists it as pending', async () => {
    const identify = await auth(request(app).post('/internal/v1/customers/identify')).send({
      channel: 'whatsapp', channel_account_external_id: fx.channelAccountExternalId, phone: fx.customerPhone,
    }).expect(200);

    const created = await auth(request(app).post('/internal/v1/handoffs')).send({
      tenant_id: fx.tenantId,
      conversation_id: identify.body.conversation.id,
      customer_id: fx.customerId,
      reason_code: 'customer_request',
      reason_detail: 'العميل طلب موظف',
      last_customer_message: 'ابغى اكلم موظف',
    }).expect(200);

    expect(created.body.customer_message).toBeTruthy();

    const pending = await auth(request(app).get('/internal/v1/handoffs/pending').query({ tenant_id: fx.tenantId })).expect(200);
    expect(pending.body.count).toBe(1);

    const resolved = await auth(request(app).post(`/internal/v1/handoffs/${created.body.handoff_id}/resolve`)).send({
      tenant_id: fx.tenantId, note: 'تم الحل', resolved_by: 'ahmed', return_to_agent: true,
    }).expect(200);
    expect(resolved.body.returned_to_agent).toBe(true);

    const conversation = await query<{ handled_by: string }>('SELECT handled_by FROM conversations');
    expect(conversation.rows[0]!.handled_by).toBe('agent');
  });

  it('lets staff add a knowledge base entry that the agent finds immediately', async () => {
    const created = await auth(request(app).post('/internal/v1/knowledge')).send({
      tenant_id: fx.tenantId,
      category: 'faq',
      title: 'التغليف كهدية',
      question: 'تغلفون هدايا؟',
      answer: 'نعم، خدمة التغليف كهدية متاحة برسوم ١٥ ريال.',
      keywords: ['تغليف', 'هدية', 'تغليف هدايا'],
      created_by: 'staff@example.com',
    }).expect(201);

    const found = await auth(
      request(app).get('/internal/v1/knowledge').query({ tenant_id: fx.tenantId, q: 'تغلفون هدايا؟' }),
    ).expect(200);

    expect(found.body.entries.map((e: { id: string }) => e.id)).toContain(created.body.entry.id);
  });

  it('versions an edit and keeps the previous revision', async () => {
    const created = await auth(request(app).post('/internal/v1/knowledge')).send({
      tenant_id: fx.tenantId, category: 'faq', title: 'اختبار المراجعات', answer: 'النسخة الأولى',
    }).expect(201);

    await auth(request(app).post('/internal/v1/knowledge')).send({
      tenant_id: fx.tenantId, id: created.body.entry.id, category: 'faq',
      title: 'اختبار المراجعات', answer: 'النسخة الثانية',
    }).expect(200);

    const { rows } = await query<{ version: number; snapshot: { answer: string } }>(
      'SELECT version, snapshot FROM knowledge_base_revisions WHERE kb_id = $1', [created.body.entry.id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.snapshot.answer).toBe('النسخة الأولى');
  });

  it('deactivates an entry so the agent stops using it', async () => {
    const created = await auth(request(app).post('/internal/v1/knowledge')).send({
      tenant_id: fx.tenantId, category: 'faq', title: 'مدخلة مؤقتة', answer: 'محتوى مؤقت',
      keywords: ['مؤقت'],
    }).expect(201);

    await auth(request(app).delete(`/internal/v1/knowledge/${created.body.entry.id}`).query({ tenant_id: fx.tenantId })).expect(200);

    const found = await auth(request(app).get('/internal/v1/knowledge').query({ tenant_id: fx.tenantId, q: 'مدخلة مؤقتة' })).expect(200);
    expect(found.body.entries.map((e: { id: string }) => e.id)).not.toContain(created.body.entry.id);
  });
});

describe('observability', () => {
  it('replays every step the agent took for a trace id', async () => {
    const processed = await auth(request(app).post('/internal/v1/process')).send({
      channel_account_external_id: fx.channelAccountExternalId,
      external_message_id: 'wamid.TRACE1', phone: fx.customerPhone, text: 'كم رسوم الشحن؟', skip_send: true,
    }).expect(200);

    const res = await auth(request(app).get(`/internal/v1/traces/${processed.body.trace_id}`)).expect(200);
    const steps = res.body.steps.map((s: { step: string }) => s.step);
    expect(steps).toContain('intent.classify');
    expect(steps).toContain('pipeline.complete');
  });

  it('404s for an unknown route with a structured error', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
