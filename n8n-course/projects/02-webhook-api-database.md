# Project 2 — Webhook → API → معالجة → قاعدة بيانات

> 🥈 **المستوى:** Intermediate · **الوحدات:** M4–M7, M9, M11 · **الزمن:** 3–4 ساعات
> **الهدف:** بناء **API صغيرة** بـ n8n تستقبل وتُثري وتخزّن وترد.

---

## 1. تحليل المتطلبات

### المشكلة
موقع الشركة يرسل عملاء محتملين، لكن البيانات فقيرة (بريد واسم فقط). الفريق يبحث يدويًا عن معلومات الشركة قبل التواصل — 10 دقائق لكل عميل.

### الحل
نقطة استقبال تُثري البيانات تلقائيًا من مصدر خارجي وتخزّنها بشكل منظَّم، وترد على المرسِل بنتيجة فورية.

### المتطلبات

| النوع | المتطلب |
|---|---|
| **وظيفي** | استقبال POST بـ `{name, email, company_domain}` |
| **وظيفي** | التحقق من صحة البيانات ورفض الناقص برسالة واضحة |
| **وظيفي** | إثراء البيانات من API خارجي |
| **وظيفي** | الحفظ في Postgres بلا تكرار |
| **وظيفي** | الرد بـ `{success, lead_id, enriched}` |
| **غير وظيفي** | الرد خلال أقل من 3 ثوانٍ |
| **غير وظيفي** | webhook مؤمَّن · لا سجلات مكررة |

### معيار النجاح
> صفر سجلات مكررة · صفر بيانات ناقصة في القاعدة · زمن استجابة < 3 ثوانٍ.

---

## 2. المعمارية

```
┌────────────────┐
│    Webhook     │  POST /lead-intake  (Header Auth)
│  (responseNode)│
└───────┬────────┘
        ▼
┌────────────────┐
│  IF: تحقق      │  الحقول المطلوبة · صيغة البريد
└───┬────────┬───┘
 صح │        │ خطأ
    ▼        ▼
┌────────┐ ┌──────────────────┐
│ إثراء  │ │ Respond 400      │
│  API   │ │ برسالة واضحة     │
└───┬────┘ └──────────────────┘
    │ (Continue On Fail — الإثراء اختياري)
    ▼
┌────────────────┐
│  Set: تطبيع    │
└───────┬────────┘
        ▼
┌────────────────┐
│ Postgres UPSERT│  ON CONFLICT (email)
└───────┬────────┘
        ▼
┌────────────────┐
│ Respond 200    │
└────────────────┘
```

### القرارات المعمارية

| القرار | السبب |
|---|---|
| `responseMode: responseNode` | نتحكم في الرد ورمز الحالة بدقة |
| التحقق **قبل** الإثراء | لا تهدر استدعاء API على بيانات غير صالحة |
| `Continue On Fail` على الإثراء | **الإثراء تحسين لا ضرورة** — فشله لا يعني فقدان العميل |
| **UPSERT** لا INSERT | webhook قد يصل مرتين |
| قيد `UNIQUE` على البريد | خط الدفاع الأخير في القاعدة نفسها |

---

## 3. مخطط قاعدة البيانات

```sql
CREATE TABLE leads (
  id             BIGSERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  name           TEXT NOT NULL,
  company_domain TEXT,
  company_name   TEXT,
  company_size   TEXT,
  industry       TEXT,
  enriched       BOOLEAN NOT NULL DEFAULT FALSE,
  source         TEXT NOT NULL DEFAULT 'website',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_email   ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
```

| القرار | السبب |
|---|---|
| `email UNIQUE` | **الحماية الحقيقية من التكرار** — حتى لو أخطأ المنطق |
| `enriched BOOLEAN` | نعرف من يحتاج إثراءً لاحقًا (إعادة معالجة) |
| `TIMESTAMPTZ` | تجنّب فوضى المناطق الزمنية |
| فهرس على `created_at DESC` | استعلامات "أحدث العملاء" سريعة |

---

## 4. التنفيذ

### 4.1 الـ Webhook
```
Method:         POST
Path:           lead-intake-<uuid عشوائي>
Authentication: Header Auth  🔐
Respond:        Using Respond to Webhook Node
```

> 🔐 استخدم مسارًا عشوائيًا **بالإضافة** إلى Header Auth — طبقتان أفضل من واحدة.

### 4.2 بوابة التحقق (IF)
```
{{ !!$json.body.email
   && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($json.body.email)
   && !!$json.body.name
   && $json.body.name.length >= 2 }}
```

> 💡 `!!` تحوّل القيمة إلى boolean صريح — تحمي من `undefined`.

### 4.3 الإثراء (HTTP Request)
- استخدم أي API إثراء متاح، أو **محاكاة**: `https://api.github.com/orgs/{domain}` كتمرين.
- ⚠️ فعّل **`Continue On Fail` → using error output**.

### 4.4 التطبيع (Set)
| الحقل | القيمة |
|---|---|
| `email` | `{{ $json.body.email.trim().toLowerCase() }}` |
| `name` | `{{ $json.body.name.trim() }}` |
| `company_name` | `{{ $json.company?.name \|\| null }}` |
| `enriched` | `{{ !!$json.company?.name }}` |

> 💡 `toLowerCase()` على البريد **إلزامي** — `Ali@x.com` و `ali@x.com` نفس الشخص، وبلا توحيد سيتجاوزان قيد `UNIQUE` وينشئان سجلين.

### 4.5 Postgres UPSERT
Operation: **Upsert** · Matching Column: `email`

### 4.6 الرد
```json
{ "success": true, "lead_id": "{{ $json.id }}", "enriched": {{ $json.enriched }} }
```

---

## 5. الاختبار

| # | السيناريو | المتوقع |
|---|---|---|
| 1 | بيانات كاملة صحيحة | 200 · سجل جديد · `enriched: true` |
| 2 | بلا بريد | 400 · رسالة واضحة · لا سجل |
| 3 | بريد بصيغة خاطئة | 400 |
| 4 | نفس البريد مرتين | 200 مرتين · **سجل واحد فقط** |
| 5 | نفس البريد بحالة أحرف مختلفة | **سجل واحد** (بفضل `toLowerCase`) |
| 6 | API الإثراء معطّل | 200 · سجل محفوظ · `enriched: false` |
| 7 | بلا Header مصادقة | 401/403 |
| 8 | حقل زائد غير متوقع | يُتجاهل بأمان |

```bash
# اختبار 4 — نفّذه مرتين
curl -X POST '<PROD_URL>' \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: <SECRET>' \
  -d '{"name":"محمد","email":"m@example.com","company_domain":"example.com"}'
```

> ⚠️ **السيناريوهان 4 و 5 هما جوهر هذا المشروع.** إن أنشآ سجلين، فالحماية من التكرار فاشلة.

---

## 6. معالجة الأخطاء

| الفشل | الاستراتيجية |
|---|---|
| بيانات غير صالحة | رفض فوري بـ 400 ورسالة تشرح السبب |
| API الإثراء | `Continue On Fail` — يُحفظ بلا إثراء |
| Postgres | Retry ×3 · إن فشل → Respond 500 + Error Workflow |
| webhook مكرر | UPSERT + قيد UNIQUE |

---

## 7. الأمان

```
[ ] Header Auth مفعّلة
[ ] مسار غير قابل للتخمين
[ ] تحقق صارم من كل الحقول
[ ] استعلامات معاملية (لا دمج نصي)
[ ] مستخدم Postgres بصلاحية INSERT/UPDATE/SELECT فقط
[ ] رسائل الخطأ لا تكشف تفاصيل داخلية
[ ] لا أسرار في السجلات
```

> 🔐 **رسائل الخطأ:** `{"error":"بيانات غير صالحة"}` وليس `{"error":"duplicate key violates constraint leads_email_key"}`.
> الرسالة الثانية تكشف بنية قاعدة بياناتك لمهاجم محتمل.

---

## 8. التحسين

| التحسين | الفائدة |
|---|---|
| فصل الإثراء إلى sub-workflow غير متزامن | رد أسرع بكثير |
| تخزين مؤقت لنتائج الإثراء لنفس النطاق | تقليل استدعاءات API |
| Dead Letter Queue للفشل النهائي | لا تفقد أي عميل |
| Rate limiting على الـ webhook | حماية من الإغراق |

---

## 9. قائمة الإنتاج

```
[ ] مؤمَّن ومُختبَر بالسيناريوهات الثمانية
[ ] لا سجلات مكررة تحت الاختبار
[ ] Error Workflow مرتبط
[ ] رمز الحالة صحيح في كل مسار
[ ] زمن الاستجابة < 3 ثوانٍ
[ ] مخطط القاعدة موثَّق
[ ] موثَّق للمستهلك: شكل الطلب والرد ورموز الأخطاء
```

## 🏋️ التحدي النهائي
أضف حماية من الإغراق: لا تقبل أكثر من **5 طلبات لنفس البريد في الساعة**.
**تلميح:** ستحتاج استعلامًا على `created_at`. أين تضع هذا الفحص في المسار — قبل الإثراء أم بعده؟ ولماذا؟
