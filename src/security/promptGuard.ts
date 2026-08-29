/**
 * Inbound content defence.
 *
 * Layer 1 (this file) detects and neutralises the obvious attempts. It is a
 * filter, not the security boundary — the real boundary is that tools take
 * tenant_id/customer_id from the session context, never from model output, so
 * an injection that "convinces" the model still cannot read another customer.
 */

export type InjectionVerdict = 'clean' | 'suspicious' | 'blocked';

export interface GuardResult {
  verdict: InjectionVerdict;
  score: number;
  matched: string[];
  /** Message text safe to embed in the prompt (wrapped + neutralised). */
  sanitized: string;
}

interface Pattern { id: string; re: RegExp; weight: number }

const PATTERNS: Pattern[] = [
  // Instruction override
  { id: 'ignore_instructions', re: /\b(ignore|disregard|forget)\b[^.\n]{0,30}\b(previous|prior|above|earlier|all)\b[^.\n]{0,20}\b(instruction|prompt|rule|direction)/i, weight: 5 },
  { id: 'ignore_instructions_ar', re: /(تجاهل|انسى|إنسى)[^.\n]{0,30}(التعليمات|الأوامر|السابق|القواعد)/, weight: 5 },
  // System prompt extraction
  { id: 'reveal_system_prompt', re: /\b(system\s*prompt|initial\s*instructions?|your\s+instructions?|prompt\s+text)\b[^.\n]{0,40}\b(show|reveal|print|repeat|output|what|give)\b/i, weight: 5 },
  { id: 'reveal_system_prompt2', re: /\b(show|reveal|print|repeat|output|dump)\b[^.\n]{0,40}\b(system\s*prompt|your\s+instructions?|initial\s+prompt|configuration)\b/i, weight: 5 },
  { id: 'reveal_system_prompt_ar', re: /(اظهر|أظهر|اعرض|اطبع|كرر|وش)[^.\n]{0,40}(البرومبت|التعليمات|النظام|الأوامر\s*الأصلية)/, weight: 5 },
  // Role hijack
  { id: 'role_hijack', re: /\b(you are now|from now on you are|act as (?:an? )?(?:admin|developer|root|system)|pretend to be)\b/i, weight: 4 },
  { id: 'role_hijack_ar', re: /(انت الحين|أنت الآن|من الحين|تصرف ك)[^.\n]{0,20}(مدير|مطور|ادمن|أدمن|نظام)/, weight: 4 },
  { id: 'developer_mode', re: /\b(developer mode|dan mode|jailbreak|sudo mode|god mode|unrestricted mode)\b/i, weight: 4 },
  // Fake message framing
  { id: 'fake_turn', re: /(^|\n)\s*(system|assistant|developer)\s*:\s*/i, weight: 3 },
  { id: 'fake_tag', re: /<\/?(system|assistant|instructions?|prompt)>/i, weight: 4 },
  // Data exfiltration
  { id: 'other_customer_data', re: /\b(all|other|another|every)\b[^.\n]{0,25}\b(customers?|users?|orders?|phone numbers?|clients?)\b/i, weight: 4 },
  { id: 'other_customer_data_ar', re: /(كل|جميع|باقي|بيانات)[^.\n]{0,25}(العملاء|الزبائن|الطلبات\s*كلها|أرقام)/, weight: 4 },
  { id: 'db_access', re: /\b(select\s+\*\s+from|drop\s+table|insert\s+into|union\s+select|delete\s+from)\b/i, weight: 5 },
  { id: 'credential_probe', re: /\b(api[_\s-]?key|access[_\s-]?token|password|secret key|env(?:ironment)? variables?|credentials?)\b/i, weight: 3 },
  // Tool abuse
  { id: 'tool_forcing', re: /\b(call|invoke|execute|run)\b[^.\n]{0,25}\b(tool|function|command|api)\b[^.\n]{0,30}\b(with|as|for)\b[^.\n]{0,20}\b(customer_id|tenant_id|admin)\b/i, weight: 4 },
];

/** Characters used to smuggle hidden instructions past a human reviewer. */
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤﻿]/g;

export function inspectInboundText(raw: string): GuardResult {
  const text = raw.normalize('NFKC').replace(INVISIBLE_CHARS, '');
  const matched: string[] = [];
  let score = 0;

  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      matched.push(p.id);
      score += p.weight;
    }
  }

  const verdict: InjectionVerdict = score >= 8 ? 'blocked' : score >= 4 ? 'suspicious' : 'clean';
  return { verdict, score, matched, sanitized: neutralize(text) };
}

/**
 * Strip the syntax an attacker uses to fake conversation structure. The text
 * is still delivered to the model (a real customer might legitimately write
 * "system:"), just without the shape that makes it look like a control turn.
 */
function neutralize(text: string): string {
  return text
    .replace(/<\/?(system|assistant|instructions?|prompt)>/gi, '')
    .replace(/(^|\n)\s*(system|assistant|developer)\s*:/gi, '$1$2 -')
    .replace(/```+/g, "'''")
    .slice(0, 4000);
}

/**
 * Wrap untrusted customer text so the model treats it as data. Paired with the
 * system prompt rule that says content inside these tags is never an
 * instruction.
 */
export function wrapUntrusted(text: string): string {
  return `<customer_message>\n${text}\n</customer_message>`;
}
