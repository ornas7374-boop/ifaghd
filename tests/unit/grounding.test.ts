import { describe, it, expect } from 'vitest';
import { checkGrounding } from '../../src/agent/grounding.js';
import type { ToolInvocation } from '../../src/tools/types.js';

function toolResult(name: string, data: unknown): ToolInvocation {
  return { name, input: {}, result: { ok: true, data }, durationMs: 5 };
}
function toolError(name: string): ToolInvocation {
  return { name, input: {}, result: { ok: false, error: { code: 'x', message: 'failed', retryable: false } }, durationMs: 5 };
}

describe('grounding check — money', () => {
  const priceTool = toolResult('get_product_price', {
    found: true,
    product: { sku: 'HP-001', name: 'سماعة', price: 349, sale_price: 299, effective_price: 299, currency: 'SAR' },
  });

  it('accepts a price that came from a tool', () => {
    expect(checkGrounding('سعر السماعة 299 ريال.', [priceTool]).grounded).toBe(true);
  });

  it('rejects a price the model invented', () => {
    const v = checkGrounding('سعر السماعة 450 ريال.', [priceTool]);
    expect(v.grounded).toBe(false);
    expect(v.violations).toContain('ungrounded_amount:450');
  });

  it('rejects any price when no tool was called at all', () => {
    expect(checkGrounding('سعرها 199 ريال.', []).grounded).toBe(false);
  });

  it('accepts Arabic-Indic digits quoted from an Arabic knowledge base answer', () => {
    const kb = toolResult('search_knowledge_base', {
      count: 1,
      results: [{ answer: 'رسوم الشحن ٢٥ ريال داخل المملكة، ومجاني للطلبات فوق ٢٠٠ ريال.' }],
    });
    expect(checkGrounding('رسوم الشحن ٢٥ ريال، ومجاني فوق ٢٠٠ ريال.', [kb]).grounded).toBe(true);
    expect(checkGrounding('رسوم الشحن 25 ريال.', [kb]).grounded).toBe(true);
  });

  it('treats 299 and 299.00 as the same amount', () => {
    const tool = toolResult('get_order_status', { found: true, total_amount: 299.0, currency: 'SAR' });
    expect(checkGrounding('إجمالي طلبك 299 ريال.', [tool]).grounded).toBe(true);
  });

  it('ignores data from a tool call that failed', () => {
    expect(checkGrounding('سعرها 299 ريال.', [toolError('get_product_price')]).grounded).toBe(false);
  });
});

describe('grounding check — order and tracking references', () => {
  const orderTool = toolResult('get_order_status', {
    found: true, order_number: 'SA-10231', status: 'shipped',
    status_label: 'تم الشحن', tracking_number: 'SM8842190233',
  });

  it('accepts an order number returned by the tool', () => {
    expect(checkGrounding('طلبك SA-10231 تم شحنه.', [orderTool]).grounded).toBe(true);
  });

  it('rejects an order number the model made up', () => {
    const v = checkGrounding('طلبك SA-99999 تم شحنه.', [orderTool]);
    expect(v.grounded).toBe(false);
    expect(v.violations).toContain('ungrounded_reference:SA-99999');
  });

  it('accepts the real tracking number', () => {
    expect(checkGrounding('رقم التتبع SM8842190233.', [orderTool]).grounded).toBe(true);
  });
});

describe('grounding check — claimed actions', () => {
  it('rejects a claim that an order was cancelled', () => {
    const v = checkGrounding('تم إلغاء الطلب، ما عليك زود.', []);
    expect(v.grounded).toBe(false);
    expect(v.violations).toContain('claimed_action:cancelled_order');
  });

  it('rejects a claim that money was refunded', () => {
    expect(checkGrounding('تم استرجاع المبلغ لحسابك.', []).violations).toContain('claimed_action:refunded');
  });

  it('rejects a claim that the address was changed', () => {
    expect(checkGrounding('تم تعديل العنوان.', []).violations).toContain('claimed_action:modified_order');
  });

  it('rejects the same claim in English', () => {
    expect(checkGrounding("I've cancelled your order.", []).violations).toContain('claimed_action:claimed_mutation_en');
  });

  it('accepts registering a request without claiming it was done', () => {
    const ticket = toolResult('create_support_ticket', {
      created: true, ticket_number: 'TCK-000001',
      customer_message: 'تم تسجيل طلبك برقم TCK-000001، وبيتواصل معك أحد الزملاء قريب.',
    });
    const v = checkGrounding('تم تسجيل طلبك برقم TCK-000001، وبيتواصل معك أحد الزملاء قريب.', [ticket]);
    expect(v.grounded).toBe(true);
  });
});

describe('grounding check — delivery promises', () => {
  it('rejects an invented delivery window', () => {
    const v = checkGrounding('بيوصلك خلال 3 أيام.', [toolResult('get_order_status', { found: true, status: 'shipped' })]);
    expect(v.grounded).toBe(false);
    expect(v.violations.some((x) => x.startsWith('ungrounded_delivery_promise'))).toBe(true);
  });

  it('accepts a delivery window that came from the knowledge base', () => {
    const kb = toolResult('search_knowledge_base', {
      results: [{ answer: 'التوصيل داخل الرياض من يوم إلى يومين عمل، وباقي المدن خلال 4 أيام عمل.' }],
    });
    expect(checkGrounding('يوصلك خلال 4 أيام عمل.', [kb]).grounded).toBe(true);
  });
});

describe('grounding check — plain conversational replies', () => {
  it('accepts replies that assert no facts', () => {
    for (const reply of [
      'أبشر، خلني أشيك لك على حالة الطلب 👍',
      'هلا وغلا، كيف أقدر أساعدك؟',
      'حوّلت محادثتك لأحد الزملاء وبيتواصل معك قريب.',
      'ما حاب أعطيك معلومة غير مؤكدة، بتوصلك من أحد الزملاء.',
    ]) {
      expect(checkGrounding(reply, []).grounded, reply).toBe(true);
    }
  });
});
