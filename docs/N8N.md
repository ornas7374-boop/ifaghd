# n8n — الاستيراد والتشغيل

## هل n8n مطلوب؟

**لا.** الخدمة ترد على العملاء بنفسها عندما يكون `WEBHOOK_DELEGATE_TO_N8N=false` (الافتراضي).

استخدم n8n عندما تريد:
- تدفقاً مرئياً يعدّله فريق العمليات بدون نشر.
- ربط أنظمة إضافية (CRM، تذاكر، تقارير) في نفس المسار.
- توجيهاً مختلفاً لكل عميل من عملائك (إن كنت تبيع النظام).

---

## الاستيراد

1. افتح n8n → **Workflows** → **Import from File**
2. استورد:
   - `n8n/workflows/customer-service-agent.json` — التدفق الرئيسي
   - `n8n/workflows/human-handoff-notify.json` — إشعار التصعيد

---

## متغيرات البيئة في n8n

الـworkflows تقرأ الإعدادات من `$env` حتى لا تُخزَّن أي أسرار داخل ملفات JSON:

| المتغير | القيمة |
|---|---|
| `AGENT_BASE_URL` | `http://agent:3000` (Docker) أو رابط الخدمة |
| `AGENT_API_KEY` | نفس `INTERNAL_API_KEY` في الخدمة |
| `HANDOFF_NOTIFY_URL` | رابط إشعار الموظف |
| `ONCALL_WEBHOOK_URL` | قناة الحالات العاجلة |
| `SUPPORT_WEBHOOK_URL` | قناة الدعم العامة |
| `HELPDESK_WEBHOOK_URL` | نظام التذاكر (اختياري) |

في `docker-compose.yml` هذه ممرّرة مسبقاً. للتثبيت اليدوي، اضبطها في بيئة عملية n8n
وأعد تشغيله.

> إن كان `N8N_BLOCK_ENV_ACCESS_IN_NODE=true` في تثبيتك، فلن تعمل تعابير `$env`.
> البديل: أنشئ **Header Auth credential** بالاسم `x-api-key` وبقيمة المفتاح،
> واربطها بعقد HTTP (غيّر `authentication` إلى `genericCredentialType`).

---

## الربط مع الخدمة

في `.env` الخاص بالخدمة:

```bash
WEBHOOK_DELEGATE_TO_N8N=true
N8N_INBOUND_WEBHOOK_URL=https://n8n.your-domain.com/webhook/whatsapp-inbound
```

المسار الكامل يصبح:

```
Meta → الخدمة (تحقق التوقيع + منع التكرار) → n8n → الخدمة (كل خطوة) → واتساب
```

**لماذا تمرّ عبر الخدمة أولاً؟** لأن توقيع Meta يُحسب على البايتات الخام،
و n8n يحلل الـJSON قبل أن تصله. اجعل التحقق حيث البايتات الأصلية.

الـworkflow يتعامل مع الشكلين (رسالة مطبّعة أو حمولة Meta خام)، فلو أرسلت من Meta
مباشرة سيعمل — لكن بدون تحقق من التوقيع.

---

## عقد التدفق الرئيسي

| العقدة | ما تفعله |
|---|---|
| WhatsApp Webhook | يستقبل (POST `/webhook/whatsapp-inbound`) |
| **Respond 200 (ACK)** | يردّ فوراً — Meta تعيد الإرسال إن لم ترَ ٢٠٠ خلال ثوانٍ |
| Validate Request | يميّز شكل الحمولة ويتجاهل ما لا يمكن معالجته |
| Raw Meta Payload? | تفريع حسب الشكل |
| Normalize via Agent API | يستخدم مُحلّل الخدمة نفسه — لا يوجد مُحلّلان يختلفان |
| Split Messages | رسالة واحدة لكل عنصر |
| Identify Customer | يحدد المستأجر والعميل والمحادثة |
| Blocked or Suspended? | يوقف المحظورين والمستأجر الموقوف و**المحادثات التي يتولاها موظف** |
| Load Conversation | الذاكرة (ملخص + آخر الرسائل) |
| Get Message Text | يوحّد الحقول لكل ما بعده |
| Classify Intent | قواعد سريعة ثم LLM |
| Needs Human Immediately? | طلب موظف أو غضب → تصعيد فوري |
| AI Agent | الأدوات + قاعدة المعرفة + الحواجز |
| Create Handoff → Notify Employee | مسار التصعيد |
| Pick Reply Text | يختار نص الرد حسب المسار، ويرفض الإرسال الفارغ |
| Send WhatsApp Message | الإرسال |
| Save Conversation | حفظ الرد |
| Log Result | سجل التنفيذ |
| Build Failure Handoff → Escalate After Failure | **أي فشل ينتهي بتصعيد، لا بصمت** |

---

## الاختبار داخل n8n

1. افتح الـworkflow واضغط **Execute Workflow** (وضع الاستماع).
2. أرسل حمولة اختبار:

```bash
curl -X POST https://n8n.your-domain.com/webhook-test/whatsapp-inbound \
  -H 'content-type: application/json' \
  -d '{"message":{
        "channel":"whatsapp",
        "channel_account_external_id":"TEST_PHONE_NUMBER_ID",
        "external_message_id":"wamid.TEST_'"$(date +%s)"'",
        "phone":"966500000001",
        "name":"سعود",
        "text":"وين طلبي SA-10231؟",
        "content_type":"text"
      },"trace_id":"trc_manual_test"}'
```

3. تابع تلوّن العقد. أي عقدة حمراء تُظهر جسم الخطأ.

**استخدم `external_message_id` جديداً في كل تجربة** — الرسالة المكرّرة تُتجاهل عمداً.

---

## التفعيل

بعد نجاح التجربة: **Active** في أعلى يمين المحرر. يتحول الرابط من
`/webhook-test/...` إلى `/webhook/...` — حدّث `N8N_INBOUND_WEBHOOK_URL` وفقاً لذلك.

---

## اختبارات تحمي هذه الـworkflows

`tests/integration/n8nWorkflow.test.ts` يقرأ ملفات الـJSON فعلياً ويتحقق أن:

- كل مرجع `$('Node')` يشير إلى عقدة موجودة.
- كل عقدة IF موصولة من الفرعين (n8n يُسقط العناصر بصمت في فرع غير موصول).
- الويبهوك يردّ ٢٠٠ **قبل** أي عمل.
- كل استدعاء للخدمة عليه `retryOnFail`.
- مسارات فشل الوكيل والإرسال تنتهي عند التصعيد.
- كل مسار API يستدعيه الـworkflow **موجود فعلاً** في الخدمة ولا يعيد 404.
- لا يوجد أي سر مضمّن في ملفات الـJSON.

هذا يعني أن إعادة تسمية مسار في الخدمة تكسر الاختبارات، لا الإنتاج.
