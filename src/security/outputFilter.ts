import type { Tenant } from '../db/types.js';

export interface OutputScanResult {
  safe: boolean;
  reasons: string[];
  /** Text with any leaked secrets/PII masked. Use this, not the raw reply. */
  text: string;
}

/**
 * Fragments that would only appear if the system prompt, its scaffolding, or
 * internal tool names leaked into a reply.
 *
 * These must stay in sync with buildSystemPrompt(). The test
 * "catches a leak of the real system prompt" builds the actual prompt and
 * asserts this list catches it, so drift fails the suite rather than shipping
 * a leak detector that no longer detects anything.
 */
const SYSTEM_PROMPT_MARKERS = [
  // Prompt scaffolding
  '<customer_message>',
  '<customer_context>',
  '<knowledge_base>',
  'system prompt',
  'you are a customer service agent',
  // Distinctive lines from the Arabic system prompt
  'أنت موظف خدمة عملاء',
  'القاعدة الأهم',
  'ممنوع تختلق',
  'شخصيتك وأسلوبك',
  'متى تحوّل لموظف بشري',
  // Internal tool names — a customer reply never needs to say these
  'handoff_to_human',
  'search_knowledge_base',
  'get_order_status',
  'create_support_ticket',
  'get_product_price',
  'tool_use',
];

const SECRET_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: 'anthropic_key', re: /sk-ant-[A-Za-z0-9_-]{10,}/g },
  { id: 'openai_key', re: /sk-(?:proj-)?[A-Za-z0-9]{20,}/g },
  { id: 'meta_token', re: /EAA[A-Za-z0-9]{20,}/g },
  { id: 'bearer', re: /\bBearer\s+[A-Za-z0-9._-]{20,}/gi },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { id: 'pg_url', re: /postgres(?:ql)?:\/\/[^\s]+/gi },
];

/**
 * Last gate before a reply reaches a customer. Two jobs:
 *  1. Never let a secret or the system prompt out.
 *  2. Never let one customer see another customer's phone number.
 */
export function scanOutboundText(
  text: string,
  ctx: { ownPhone?: string; tenant?: Pick<Tenant, 'settings'> | null } = {},
): OutputScanResult {
  const reasons: string[] = [];
  let out = text;

  for (const { id, re } of SECRET_PATTERNS) {
    if (re.test(out)) {
      reasons.push(`secret:${id}`);
      out = out.replace(re, '[محذوف]');
    }
    re.lastIndex = 0;
  }

  const lowered = out.toLowerCase();
  for (const marker of SYSTEM_PROMPT_MARKERS) {
    if (lowered.includes(marker.toLowerCase())) {
      reasons.push(`system_prompt_leak:${marker}`);
      break;
    }
  }

  // Any phone-shaped number that is not this customer's own and not a tenant
  // support number is treated as another customer's PII.
  //
  // Two constraints keep this from eating legitimate content:
  //  - the match must not be glued to a letter or digit, so alphanumeric
  //    tracking numbers ("SM123456789") are not mistaken for phone numbers;
  //  - it must carry at least 10 digits, so order totals, quantities and
  //    dates never trip it.
  const allowed = new Set(
    [ctx.ownPhone, (ctx.tenant?.settings as { supportPhone?: string } | undefined)?.supportPhone]
      .filter(Boolean)
      .map((p) => digitsOnly(p as string)),
  );
  const phoneRe = /(?<![A-Za-z0-9\u0660-\u0669])(\+?\d[\d\s-]{8,16}\d)(?![A-Za-z0-9])/g;
  for (const match of out.match(phoneRe) ?? []) {
    const digits = digitsOnly(match);
    if (digits.length < 10 || digits.length > 15) continue;
    if ([...allowed].some((a) => a.endsWith(digits.slice(-9)) || digits.endsWith(a.slice(-9)))) continue;
    reasons.push('foreign_phone_number');
    out = out.replace(match, '[رقم محذوف]');
  }

  return { safe: reasons.length === 0, reasons, text: out };
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** Redaction for logs/notifications: keeps the last 4 digits only. */
export function maskPhone(phone: string): string {
  const d = digitsOnly(phone);
  return d.length <= 4 ? '****' : `${'*'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}
