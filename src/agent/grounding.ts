import type { ToolInvocation } from '../tools/types.js';

export interface GroundingVerdict {
  grounded: boolean;
  violations: string[];
  /** Facts we could verify, for the audit log. */
  checked: { numbers: number; claims: number };
}

/**
 * Post-generation grounding check.
 *
 * The system prompt tells the model not to invent facts; this verifies it.
 * Every price-like number, order number and tracking number in the reply must
 * appear somewhere in the tool results for this turn. It also catches the
 * model claiming to have performed an action it cannot perform.
 *
 * Deliberately conservative — a false positive costs one escalation, while a
 * false negative sends a customer a made-up price.
 */
export function checkGrounding(reply: string, invocations: ToolInvocation[]): GroundingVerdict {
  const violations: string[] = [];
  const corpus = buildCorpus(invocations);

  // ---- 1. Claimed actions the agent cannot perform ----------------------
  for (const { re, label } of ACTION_CLAIMS) {
    if (re.test(reply)) violations.push(`claimed_action:${label}`);
  }

  // ---- 2. Money amounts --------------------------------------------------
  const amounts = extractAmounts(reply);
  for (const amount of amounts) {
    if (!corpusHasNumber(corpus, amount)) violations.push(`ungrounded_amount:${amount}`);
  }

  // ---- 3. Order / tracking numbers --------------------------------------
  const refs = extractReferences(reply);
  for (const ref of refs) {
    if (!corpus.text.includes(ref.toUpperCase())) violations.push(`ungrounded_reference:${ref}`);
  }

  // ---- 4. Concrete delivery promises ------------------------------------
  // Phrases like "خلال ٣ أيام" are only OK if that text came from a tool or the KB.
  for (const promise of extractDeliveryPromises(reply)) {
    if (!corpusHasNumber(corpus, promise.value) && !corpus.text.includes(promise.raw)) {
      violations.push(`ungrounded_delivery_promise:${promise.raw}`);
    }
  }

  return {
    grounded: violations.length === 0,
    violations,
    checked: { numbers: amounts.length + refs.length, claims: ACTION_CLAIMS.length },
  };
}

/** Phrases that assert a completed mutation. The agent has no such tool. */
const ACTION_CLAIMS: Array<{ re: RegExp; label: string }> = [
  { re: /(تم|سويت|قمت ب|أنهيت|انهيت)\s*(إلغاء|الغاء|إلغاء الطلب|الغاء الطلب)/, label: 'cancelled_order' },
  { re: /(تم|سويت|قمت ب)\s*(استرجاع|إرجاع|ارجاع)\s*(المبلغ|الفلوس|المبالغ)/, label: 'refunded' },
  { re: /(حوّلت|حولت|أرسلت|ارسلت)\s*(لك)?\s*(المبلغ|الفلوس)/, label: 'sent_money' },
  { re: /(تم|سويت|قمت ب)\s*(تعديل|تغيير)\s*(العنوان|الطلب|الكمية)/, label: 'modified_order' },
  { re: /\b(i have|i've)\s+(cancelled|canceled|refunded|updated your order)\b/i, label: 'claimed_mutation_en' },
];

interface Corpus { text: string; numbers: Set<string> }

function buildCorpus(invocations: ToolInvocation[]): Corpus {
  const parts: string[] = [];
  for (const inv of invocations) {
    if (!inv.result.ok) continue;
    parts.push(JSON.stringify(inv.result.data));
  }
  // Knowledge base answers are written in Arabic and routinely use
  // Arabic-Indic digits ("رسوم الشحن ٢٥ ريال"). Without folding those to
  // Western digits here, every such answer looks ungrounded and the agent
  // escalates a reply it quoted correctly from the KB.
  const text = toWesternDigits(parts.join(' ')).toUpperCase();

  const numbers = new Set<string>();
  for (const m of text.match(/\d+(?:\.\d+)?/g) ?? []) {
    numbers.add(normalizeNumber(m));
  }
  return { text, numbers };
}

/**
 * A tool returning 249 grounds a reply saying "249", "249.00" or "٢٤٩".
 * Comparison is on a normalized numeric string so formatting never matters.
 */
function corpusHasNumber(corpus: Corpus, value: string): boolean {
  const n = normalizeNumber(value);
  if (corpus.numbers.has(n)) return true;
  // Tool said 249.00, reply says 249 (or vice versa).
  const asFloat = Number(n);
  if (!Number.isFinite(asFloat)) return false;
  for (const candidate of corpus.numbers) {
    if (Number(candidate) === asFloat) return true;
  }
  return false;
}

function normalizeNumber(raw: string): string {
  const western = toWesternDigits(raw).replace(/,/g, '');
  const asFloat = Number(western);
  return Number.isFinite(asFloat) ? String(asFloat) : western;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function toWesternDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** Numbers that read as money: next to a currency word or symbol. */
function extractAmounts(reply: string): string[] {
  const normalized = toWesternDigits(reply);
  const out = new Set<string>();
  const patterns = [
    /(\d[\d,]*(?:\.\d+)?)\s*(?:ريال|ر\.س|SAR|sar|درهم|AED|جنيه|دولار|USD)/g,
    /(?:ريال|ر\.س|SAR|sar)\s*(\d[\d,]*(?:\.\d+)?)/g,
    /(?:سعره?|بسعر|السعر|المبلغ|الإجمالي|الاجمالي|المجموع)\s*(?:هو\s*)?(\d[\d,]*(?:\.\d+)?)/g,
  ];
  for (const re of patterns) {
    for (const m of normalized.matchAll(re)) {
      if (m[1]) out.add(m[1]);
    }
  }
  return [...out];
}

/** Order-number / tracking-number shapes. */
function extractReferences(reply: string): string[] {
  const normalized = toWesternDigits(reply);
  const out = new Set<string>();
  for (const m of normalized.matchAll(/\b([A-Z]{2,5}-\d{3,})\b/gi)) if (m[1]) out.add(m[1]);
  for (const m of normalized.matchAll(/\b(?:تتبع|التتبع|tracking)\s*[:#]?\s*([A-Z0-9]{8,})\b/gi)) if (m[1]) out.add(m[1]);
  return [...out];
}

/** "خلال ٣ أيام" / "بعد يومين" — a promise unless a tool said so. */
function extractDeliveryPromises(reply: string): Array<{ raw: string; value: string }> {
  const normalized = toWesternDigits(reply);
  const out: Array<{ raw: string; value: string }> = [];
  for (const m of normalized.matchAll(/(?:خلال|بعد|في غضون|within)\s*(\d{1,2})\s*(?:أيام|ايام|يوم|أسابيع|اسابيع|ساعة|ساعات|days?|hours?)/gi)) {
    if (m[0] && m[1]) out.push({ raw: m[0], value: m[1] });
  }
  return out;
}
