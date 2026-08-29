# ifaghd — AI Customer Service Agent

وكيل خدمة عملاء بالذكاء الاصطناعي على واتساب، للمتاجر السعودية.
يرد باللهجة السعودية، يقرأ الطلبات والأسعار من قاعدة البيانات، ويحوّل لموظف بشري
عندما لا يملك إجابة مؤكدة.

**القاعدة الحاكمة للتصميم: الوكيل لا يختلق أي معلومة.** ما لم يأتِ من أداة أو من
قاعدة المعرفة، لا يُقال للعميل. وهذا مفروض بالكود وفاحص آلي، لا بالبرومبت وحده.

```
العميل: وين طلبي SA-10231؟
الوكيل: أبشر، طلبك تم شحنه مع سمسا ورقم التتبع SM8842190233 👍
        ↑ من قاعدة البيانات، بعد التحقق أن الطلب يخص هذا العميل تحديداً
```

---

## الحالة

| | |
|---|---|
| **الاختبارات** | ١٤٧ اختباراً، كلها ناجحة على PostgreSQL حقيقي |
| **فحص الأنواع** | نظيف (`strict` مفعّل) |
| **اختبار الدخان** | ٨ سيناريوهات محادثة كاملة، ناجحة |
| **الويبهوك** | مختبر حياً: مصافحة Meta، ابتلاع رسالة، منع تكرار، حفظ |
| **قاعدة البيانات** | ١٧ جدولاً + ٢ views، ٨ ترحيلات مطبّقة |

---

## البدء السريع

```bash
cp .env.example .env      # املأ DATABASE_URL و INTERNAL_API_KEY و مفتاح LLM
npm install
npm run migrate
npm run seed              # متجر تجريبي للتجربة
npm run dev
npm run smoke             # ٨ محادثات كاملة عبر خط المعالجة الحقيقي
```

أو بـDocker: `docker compose up -d` ثم `docker compose exec agent npm run migrate`.

التفاصيل في **[docs/SETUP.md](docs/SETUP.md)**.

---

## الوثائق

| | |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | كيف يعمل النظام ولماذا صُمّم هكذا |
| [docs/SETUP.md](docs/SETUP.md) | التشغيل من الصفر، وتحرير قاعدة المعرفة |
| [docs/WHATSAPP.md](docs/WHATSAPP.md) | ما تحتاج تعبئته من Meta Developer Console |
| [docs/N8N.md](docs/N8N.md) | استيراد وتشغيل الـworkflows |
| [docs/TESTING.md](docs/TESTING.md) | ما هو مختبَر وكيف تشغّله |
| [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | قبل أول عميل حقيقي |

---

## كيف يُمنع الاختلاق فعلياً

ثلاث طبقات، أضعفها البرومبت:

**١. لا يملك المعلومة أصلاً.** الأسعار والطلبات والسياسات ليست في البرومبت.
كل حقيقة تأتي من أداة تقرأ من PostgreSQL.

**٢. فاحص استناد بعد التوليد** (`src/agent/grounding.ts`). كل مبلغ ورقم طلب ورقم تتبع
ووعد توصيل في الرد يجب أن يوجد في نتائج أدوات هذه الجولة. وإلا يُحجب الرد
ويُصعّد لموظف. كما يرفض أي ادعاء بتنفيذ عملية ("تم الإلغاء"، "تم الاسترجاع")
لأن الوكيل لا يملك أي أداة تنفّذ ذلك.

**٣. الأداة نفسها ترفض التخمين.** `get_product_price` عند تعدد المطابقات المتقاربة
تُرجع قائمة مرشحين بدل سعر، فيسأل الوكيل العميل أي منتج يقصد بدل أن يخمّن.

**مثال حقيقي من الاختبارات:**

```
النموذج (مُبرمَج للاختبار): "سعر السماعة 1299 ريال، متوفرة الحين."
النتيجة: 🚫 محجوب — ungrounded_amount:1299
ما وصل العميل: "ما حاب أعطيك معلومة غير مؤكدة، حوّلت سؤالك لأحد الزملاء."
```

---

## كيف يُمنع تسريب بيانات عميل لعميل آخر

البرومبت يقول "لا تعطِ بيانات عميل آخر". لكن ما يمنع ذلك فعلاً:

- `ToolContext.customerId` يأتي من الجلسة، **لا من مخرجات النموذج**.
- `getOrder` تضيف `AND o.customer_id = $n` في SQL نفسه.
- `get_customer` **لا تملك أي معامل** لطلب عميل آخر — لا يوجد مسار للطلب أصلاً.
- نموذج الصلاحيات لا يمنح الوكيل `order:read_any` ولا `order:write` إطلاقاً.

حتى لو نجح مهاجم في إقناع النموذج تماماً، لا يوجد مسار تقني ينفّذ الطلب.
مختبر في `tests/integration/tools.test.ts`.

---

## التصعيد لموظف بشري

يحدث تلقائياً عند: طلب العميل موظفاً · غضب واضح · موضوع حساس ·
فشل أداة · لا إجابة في قاعدة المعرفة · حجب فاحص الاستناد · فشل الـLLM.

يُسجَّل: السبب، ملخص المحادثة، لقطة بيانات العميل، آخر رسالة، الوقت.
ثم يُرسل إشعار (Webhook / Slack / واتساب)، وتتوقف ردود الوكيل على تلك المحادثة.

**سجل التصعيد يُحفظ قبل الإشعار** — فشل الإشعار لا يضيّع الطلب،
ويبقى ظاهراً في `v_pending_handoffs`.

---

## القابلية للاستبدال

| العنصر | كيف تغيّره |
|---|---|
| مزوّد الـLLM | `LLM_PROVIDER=openai` في `.env`. لا تغيير كود. |
| النموذج | `LLM_MODEL` + `LLM_FALLBACK_MODEL` |
| قناة التواصل | نفّذ `ChannelAdapter` وسجّله. الوكيل لا يذكر واتساب. |
| قاعدة المعرفة | صفوف في قاعدة البيانات أو `POST /internal/v1/knowledge` |
| مصدر الطلبات | استبدل `src/db/repositories/commerce.ts` |
| تنسيق التدفق | n8n اختياري (`WEBHOOK_DELEGATE_TO_N8N`) |
| شركة جديدة | صف في `tenants` + صف في `channel_accounts` |

---

## بنية المشروع

```
src/
├── agent/          خط المعالجة، البرومبت، النية، الذاكرة، فاحص الاستناد
├── tools/          ٨ أدوات مع مخططات دخل/خرج وصلاحيات ومعالجة أخطاء
├── llm/            واجهة المزوّد + anthropic / openai / mock
├── channels/       واجهة القناة + واتساب (تحليل، توقيع، إرسال)
├── db/             تجمّع الاتصالات، الترحيلات، المستودعات
├── security/       حقن التعليمات، فلتر المخرجات، الصلاحيات
├── handoff/        التصعيد والإشعار
├── api/            الويبهوك + API داخلي لـn8n + الصحة
└── observability/  التسجيل

db/migrations/      ٨ ترحيلات (أمامية فقط، ببصمة تحقق)
db/seeds/           قاعدة معرفة عربية + متجر تجريبي
n8n/workflows/      workflow رئيسي + workflow تصعيد
tests/              ١٤٧ اختباراً
docs/               ٥ ملفات توثيق
```

---

## n8n-mcp

This project is configured to use [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), a Model Context Protocol server that gives AI assistants structured access to n8n's nodes, documentation, and workflow validation tools.

The server is registered in [`.mcp.json`](.mcp.json) and runs via `npx n8n-mcp`, so no separate install step is required — Claude Code (or any MCP-compatible client) will fetch and launch it automatically.

By default it runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work out of the box with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, `.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from your environment (`${N8N_API_URL}` / `${N8N_API_KEY}`) rather than hardcoding them, since this repository is public and these are sensitive credentials.

1. Copy `.env` (already present locally, git-ignored) or create your own with:
   ```
   N8N_API_URL=https://your-n8n-instance.com
   N8N_API_KEY=your-api-key
   ```
2. Load it into your shell before starting your MCP client, e.g.:
   ```bash
   set -a && source .env && set +a
   ```
3. Restart your MCP client (or run `/mcp` in Claude Code) to pick up the change.

**Never commit `.env`** — it's listed in `.gitignore` for exactly this reason. If this repository is ever made private, credentials can instead be hardcoded directly in `.mcp.json` if preferred.
