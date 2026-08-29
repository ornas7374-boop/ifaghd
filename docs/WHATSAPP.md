# ربط WhatsApp Business API

## ما تحتاج تعبئته من Meta Developer Console

| القيمة | من أين تجدها في Meta | يذهب إلى |
|---|---|---|
| **App Secret** | App Dashboard → Settings → Basic → App Secret | `WHATSAPP_APP_SECRET` |
| **Phone number ID** | WhatsApp → API Setup → "Phone number ID" | `WHATSAPP_PHONE_NUMBER_ID` + عمود `channel_accounts.external_id` |
| **Access Token** | WhatsApp → API Setup (مؤقت ٢٤ ساعة) أو System User (دائم) | `WHATSAPP_ACCESS_TOKEN` |
| **Verify Token** | أنت تخترعه، وتكتب نفس القيمة في Meta | `WHATSAPP_VERIFY_TOKEN` |
| **WABA ID** | WhatsApp → API Setup | للمرجع فقط |

---

## الخطوات

### ١. أنشئ التطبيق

Meta for Developers → **My Apps** → **Create App** → نوع **Business** → أضف منتج **WhatsApp**.

### ٢. احصل على رقم

من **WhatsApp → API Setup**. رقم الاختبار مجاني ويرسل لخمسة أرقام مسجّلة فقط.
للإنتاج أضف رقمك الحقيقي وأكمل توثيق النشاط (Business Verification).

### ٣. توكن دائم

توكن API Setup ينتهي خلال ٢٤ ساعة — لا يصلح للإنتاج.

Business Settings → **Users → System Users** → أنشئ مستخدم نظام بدور Admin →
**Generate New Token** → اختر التطبيق → فعّل صلاحيتي `whatsapp_business_messaging`
و`whatsapp_business_management` → انسخ التوكن.

### ٤. اربط الويبهوك

الخدمة يجب أن تكون على **HTTPS عام**. للتجربة المحلية:

```bash
ngrok http 3000
```

في Meta: **WhatsApp → Configuration → Webhook → Edit**

- **Callback URL**: `https://your-domain.com/webhook/whatsapp`
- **Verify Token**: نفس قيمة `WHATSAPP_VERIFY_TOKEN`

اضغط **Verify and Save**. Meta ترسل `GET` بـ`hub.challenge` والخدمة تردّه إن طابق التوكن.

ثم **Manage** → فعّل الاشتراك في حقل **messages**.

> فعّل حقل `messages` فقط. الحقول الأخرى تولّد ضجيجاً بلا فائدة هنا.

### ٥. تحقق

```bash
# ١. المصافحة
curl "https://your-domain.com/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=test123"
# المتوقع: test123

# ٢. أرسل رسالة واتساب حقيقية للرقم، ثم:
psql $DATABASE_URL -c "SELECT direction, role, content FROM messages ORDER BY sent_at DESC LIMIT 4;"
```

---

## التحقق من التوقيع

Meta توقّع كل ويبهوك بـ`X-Hub-Signature-256` = HMAC-SHA256 على **البايتات الخام** للجسم.

الخدمة تستخدم `express.raw()` على مسار الويبهوك تحديداً (قبل `express.json()`)
حتى تبقى البايتات كما أُرسلت. إعادة تسلسل JSON تغيّر البايتات ويفشل التحقق.

- المقارنة بـ`timingSafeEqual` — لا تسريب عبر التوقيت.
- في الإنتاج، مخطط الإعدادات **يرفض الإقلاع** إذا كان
  `NODE_ENV=production` و`WHATSAPP_REQUIRE_SIGNATURE=true` بدون `WHATSAPP_APP_SECRET`.
- `WHATSAPP_REQUIRE_SIGNATURE=false` للتطوير المحلي فقط.

**لهذا السبب** لا يُنصح بجعل Meta ترسل إلى n8n مباشرة: n8n يحلل الـJSON قبل أن تصله،
فلا يمكنه إعادة إنتاج البايتات الأصلية بشكل موثوق. اجعل الخدمة تستقبل وتتحقق،
ثم تمرّر الرسالة المطبّعة إلى n8n.

---

## نافذة الـ٢٤ ساعة

قاعدة من Meta، وليست من هذا النظام:

- تقدر ترسل رسائل نصية حرة خلال **٢٤ ساعة** من آخر رسالة أرسلها العميل.
- بعد ذلك، الرسالة الأولى يجب أن تكون **قالباً معتمداً** (Message Template).

الوكيل يعمل بالرد على رسائل واردة، فهو دائماً داخل النافذة. لكن **إشعارات التصعيد
المتأخرة** قد تخرج منها: إن أرسل موظف رداً بعد أكثر من ٢٤ ساعة، يحتاج قالباً معتمداً.
خطط لذلك في نظام التذاكر.

---

## أخطاء شائعة

| العرض | السبب | الحل |
|---|---|---|
| Verify يفشل | التوكن غير مطابق أو الخدمة غير عامة | تحقق من `WHATSAPP_VERIFY_TOKEN` وأن HTTPS يعمل |
| ويبهوك يصل لكن 401 | `WHATSAPP_APP_SECRET` خاطئ | انسخه من App Settings → Basic |
| ويبهوك يصل و200 لكن لا رد | `phone_number_id` غير مربوط بمستأجر | أضف صفاً في `channel_accounts` |
| الإرسال يفشل 401 | التوكن منتهٍ | استخدم توكن System User الدائم |
| الإرسال يفشل 131030 | الرقم غير مسجّل في قائمة الاختبار | أضفه في API Setup، أو انقل للإنتاج |
| رسائل مكرّرة | إعادة إرسال من Meta | مُعالَج: `webhook_events` + فهرس فريد على `channel_message_id` |

لتشخيص أي رسالة:

```bash
psql $DATABASE_URL -c "SELECT external_event_id, status, error FROM webhook_events ORDER BY received_at DESC LIMIT 5;"
curl -H "x-api-key: $INTERNAL_API_KEY" http://localhost:3000/internal/v1/traces/<trace_id>
```
