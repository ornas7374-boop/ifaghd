import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { parseWhatsAppWebhook, normalizePhone } from '../../src/channels/whatsapp/parser.js';
import { verifyMetaSignature, verifyToken } from '../../src/channels/whatsapp/signature.js';
import { splitForWhatsApp } from '../../src/channels/whatsapp/client.js';

function envelope(messages: unknown[], contacts: unknown[] = []): unknown {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'WABA_ID',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '966500000000', phone_number_id: 'PNID_1' },
          contacts, messages,
        },
      }],
    }],
  };
}

describe('WhatsApp webhook parser', () => {
  it('extracts a text message with the contact name', () => {
    const parsed = parseWhatsAppWebhook(envelope(
      [{ id: 'wamid.A', from: '966500000001', timestamp: '1735000000', type: 'text', text: { body: 'وين طلبي؟' } }],
      [{ wa_id: '966500000001', profile: { name: 'سعود' } }],
    ));
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      channel: 'whatsapp',
      channelAccountExternalId: 'PNID_1',
      externalMessageId: 'wamid.A',
      customerPhone: '966500000001',
      customerName: 'سعود',
      text: 'وين طلبي؟',
      contentType: 'text',
    });
  });

  it('handles several messages in one delivery', () => {
    const parsed = parseWhatsAppWebhook(envelope([
      { id: 'wamid.A', from: '966500000001', type: 'text', text: { body: 'أول' } },
      { id: 'wamid.B', from: '966500000002', type: 'text', text: { body: 'ثاني' } },
    ]));
    expect(parsed.map((m) => m.text)).toEqual(['أول', 'ثاني']);
  });

  it('ignores status callbacks, which carry no customer text', () => {
    const statusOnly = {
      object: 'whatsapp_business_account',
      entry: [{ changes: [{ field: 'messages', value: {
        metadata: { phone_number_id: 'PNID_1' },
        statuses: [{ id: 'wamid.A', status: 'delivered' }],
      } }] }],
    };
    expect(parseWhatsAppWebhook(statusOnly)).toEqual([]);
  });

  it('gives non-text messages a text representation instead of dropping them', () => {
    const parsed = parseWhatsAppWebhook(envelope([
      { id: 'w1', from: '966500000001', type: 'audio', audio: { id: 'a1' } },
      { id: 'w2', from: '966500000001', type: 'image', image: { id: 'i1', caption: 'هذا المنتج' } },
      { id: 'w3', from: '966500000001', type: 'location', location: { name: 'الرياض' } },
      { id: 'w4', from: '966500000001', type: 'interactive', interactive: { button_reply: { id: 'b', title: 'نعم' } } },
    ]));
    expect(parsed.map((m) => [m.contentType, m.text])).toEqual([
      ['audio', '[أرسل العميل رسالة صوتية]'],
      ['image', 'هذا المنتج'],
      ['location', '[أرسل العميل موقعاً: الرياض]'],
      ['interactive', 'نعم'],
    ]);
  });

  it('returns an empty array for junk payloads rather than throwing', () => {
    for (const junk of [null, undefined, {}, { entry: null }, 'not json', 42, { entry: [{}] }]) {
      expect(parseWhatsAppWebhook(junk)).toEqual([]);
    }
  });

  it('normalises phone numbers to digits only', () => {
    expect(normalizePhone('+966 50 000 0001')).toBe('966500000001');
  });
});

describe('Meta signature verification', () => {
  const secret = 'app-secret';
  const bodyBytes = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8');
  const valid = `sha256=${createHmac('sha256', secret).update(bodyBytes).digest('hex')}`;

  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(bodyBytes, valid, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifyMetaSignature(Buffer.from('{"hello":"mars"}'), valid, secret)).toBe(false);
  });

  it('rejects a wrong secret, a missing header, and malformed values', () => {
    expect(verifyMetaSignature(bodyBytes, valid, 'other-secret')).toBe(false);
    expect(verifyMetaSignature(bodyBytes, undefined, secret)).toBe(false);
    expect(verifyMetaSignature(bodyBytes, 'sha256=zz', secret)).toBe(false);
    expect(verifyMetaSignature(bodyBytes, valid, '')).toBe(false);
  });

  it('verifies the subscription token', () => {
    expect(verifyToken('tok', 'tok')).toBe(true);
    expect(verifyToken('tok', 'other')).toBe(false);
    expect(verifyToken(undefined, 'tok')).toBe(false);
  });
});

describe('outbound message splitting', () => {
  it('leaves a short reply as one message', () => {
    expect(splitForWhatsApp('رد قصير')).toEqual(['رد قصير']);
  });

  it('splits an over-long body and keeps every chunk within the limit', () => {
    const long = Array.from({ length: 400 }, (_, i) => `سطر رقم ${i}`).join('\n');
    const chunks = splitForWhatsApp(long, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
    expect(chunks.join('\n').replace(/\s+/g, '')).toBe(long.replace(/\s+/g, ''));
  });

  it('never emits an empty message', () => {
    expect(splitForWhatsApp('   ')).toEqual(['...']);
  });
});
