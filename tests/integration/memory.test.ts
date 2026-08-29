import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ensureSchema, truncateAll, seedFixture, closePool, query, type TestFixture } from '../helpers/testDb.js';
import { loadMemory, maybeUpdateSummary, toLlmMessages } from '../../src/agent/memory.js';
import { appendMessage, findOrCreateOpenConversation, getConversationById } from '../../src/db/repositories/conversations.js';
import { getCustomerById } from '../../src/db/repositories/customers.js';
import { setProvider, MockProvider } from '../../src/llm/index.js';
import type { Message } from '../../src/db/types.js';

let fx: TestFixture;
let conversationId: string;
let mock: MockProvider;

beforeAll(async () => { await ensureSchema(); });
afterAll(async () => { setProvider(null); await closePool(); });

beforeEach(async () => {
  await truncateAll();
  fx = await seedFixture();
  mock = new MockProvider();
  setProvider(mock);
  const { conversation } = await findOrCreateOpenConversation({
    tenantId: fx.tenantId, customerId: fx.customerId, channel: 'whatsapp',
  });
  conversationId = conversation.id;
});

async function addTurn(customerText: string, agentText: string): Promise<void> {
  await appendMessage({
    tenantId: fx.tenantId, conversationId, customerId: fx.customerId,
    direction: 'inbound', role: 'customer', content: customerText,
    channelMessageId: `in.${randomUUID()}`,
  });
  await appendMessage({
    tenantId: fx.tenantId, conversationId, customerId: fx.customerId,
    direction: 'outbound', role: 'agent', content: agentText,
    channelMessageId: `out.${randomUUID()}`,
  });
}

describe('conversation memory window', () => {
  it('caps history at the configured limit however long the chat gets', async () => {
    for (let i = 0; i < 30; i++) await addTurn(`سؤال ${i}`, `جواب ${i}`);

    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    const customer = (await getCustomerById(fx.tenantId, fx.customerId))!;
    const memory = await loadMemory({ conversation, customer, historyLimit: 10 });

    expect(conversation.message_count).toBe(60);
    expect(memory.messagesConsidered).toBe(10);
    // Cost must not grow with conversation length.
    expect(memory.history.length).toBeLessThanOrEqual(10);
  });

  it('returns turns oldest-first, as the providers require', async () => {
    await addTurn('أول سؤال', 'أول جواب');
    await addTurn('ثاني سؤال', 'ثاني جواب');

    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    const customer = (await getCustomerById(fx.tenantId, fx.customerId))!;
    const memory = await loadMemory({ conversation, customer });

    expect(memory.history[0]!.role).toBe('user');
    expect(JSON.stringify(memory.history[0]!.content)).toContain('أول سؤال');
  });

  it('builds a compact customer card instead of shipping the full profile', async () => {
    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    const customer = (await getCustomerById(fx.tenantId, fx.customerId))!;
    const memory = await loadMemory({ conversation, customer });

    expect(memory.customerCard).toContain('سعود');
    expect(memory.customerCard.length).toBeLessThan(200);
    // The card is context, not a data dump: no email, no phone.
    expect(memory.customerCard).not.toContain('saud@example.com');
    expect(memory.customerCard).not.toContain(fx.customerPhone);
  });
});

describe('message formatting for the model', () => {
  const base = {
    id: 'm', tenant_id: 't', conversation_id: 'c', customer_id: 'cu',
    content_type: 'text' as const, channel_message_id: null, intent: null,
    tool_calls: [], sent_at: new Date(),
  };

  it('wraps customer text as untrusted data and leaves agent text alone', () => {
    const messages = [
      { ...base, direction: 'inbound' as const, role: 'customer' as const, content: 'وين طلبي' },
      { ...base, direction: 'outbound' as const, role: 'agent' as const, content: 'أبشر' },
    ] as Message[];

    const llm = toLlmMessages(messages);
    expect(llm[0]!.content).toBe('<customer_message>\nوين طلبي\n</customer_message>');
    expect(llm[1]!.content).toBe('أبشر');
  });

  it('merges consecutive same-role turns, which providers reject', () => {
    const messages = [
      { ...base, direction: 'inbound' as const, role: 'customer' as const, content: 'أول' },
      { ...base, direction: 'inbound' as const, role: 'customer' as const, content: 'ثاني' },
      { ...base, direction: 'outbound' as const, role: 'agent' as const, content: 'رد' },
    ] as Message[];

    const llm = toLlmMessages(messages);
    expect(llm).toHaveLength(2);
    expect(llm[0]!.content).toContain('أول');
    expect(llm[0]!.content).toContain('ثاني');
  });

  it('drops leading assistant turns so the history starts with the customer', () => {
    const messages = [
      { ...base, direction: 'outbound' as const, role: 'agent' as const, content: 'رسالة ترحيب' },
      { ...base, direction: 'inbound' as const, role: 'customer' as const, content: 'هلا' },
    ] as Message[];

    expect(toLlmMessages(messages)[0]!.role).toBe('user');
  });

  it('excludes internal system notes from what the model sees', () => {
    const messages = [
      { ...base, direction: 'inbound' as const, role: 'system' as const, content: 'ملاحظة داخلية' },
      { ...base, direction: 'inbound' as const, role: 'customer' as const, content: 'هلا' },
    ] as Message[];

    const llm = toLlmMessages(messages);
    expect(JSON.stringify(llm)).not.toContain('ملاحظة داخلية');
  });
});

describe('rolling summary', () => {
  it('does not summarise a short conversation', async () => {
    await addTurn('سؤال', 'جواب');
    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    expect(await maybeUpdateSummary({ conversation, traceId: 'trc' })).toBeNull();
  });

  it('summarises once the conversation outgrows the window and advances the marker', async () => {
    for (let i = 0; i < 8; i++) await addTurn(`سؤال ${i}`, `جواب ${i}`);
    mock.script({ text: 'العميل يسأل عن حالة طلبه ولم يُحل بعد.' });

    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    const summary = await maybeUpdateSummary({ conversation, traceId: 'trc' });

    expect(summary).toBe('العميل يسأل عن حالة طلبه ولم يُحل بعد.');

    const updated = (await getConversationById(fx.tenantId, conversationId))!;
    expect(updated.summary).toBe(summary);
    // The marker must advance, or the same turns get summarised forever.
    expect(updated.summary_message_count).toBe(16);
  });

  it('keeps the conversation working when summarisation fails', async () => {
    for (let i = 0; i < 8; i++) await addTurn(`سؤال ${i}`, `جواب ${i}`);
    const failing = new MockProvider();
    failing.complete = async () => { throw new Error('summary model down'); };
    setProvider(failing);

    const conversation = (await getConversationById(fx.tenantId, conversationId))!;
    await expect(maybeUpdateSummary({ conversation, traceId: 'trc' })).resolves.toBeNull();

    const { rows } = await query<{ status: string }>(
      `SELECT status FROM agent_logs WHERE step = 'memory.summarized'`,
    );
    expect(rows[0]!.status).toBe('error');
  });
});
