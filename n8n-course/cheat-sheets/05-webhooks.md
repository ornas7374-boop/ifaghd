# 🪝 Webhook Cheat Sheet

📌 `n8n-nodes-base.webhook` v2.1 · `respondToWebhook` v1.5

## الإعدادات

| الإعداد | الخيارات | التوصية |
|---|---|---|
| Method | GET/POST/PUT/PATCH/DELETE | POST للاستقبال |
| Path | مخصص | **UUID عشوائي** |
| Authentication | None/Basic/Header | 🔐 **ليس None أبدًا** |
| Respond | Immediately / Last Node / **Respond Node** | Respond Node للتحكم |

## ⚠️ Test مقابل Production

| | Test URL | Production URL |
|---|---|---|
| متى | "Listen for test event" | workflow **Active** |
| الطلبات | **واحد فقط** | غير محدود |

🐛 **"عمل مرة ثم توقف" = تستخدم Test URL**

## بنية البيانات الواردة

```json
{
  "headers": { "content-type": "application/json" },
  "params":  { },
  "query":   { },
  "body":    { "بياناتك هنا" }
}
```

⚠️ **بياناتك في `body`:** `{{ $json.body.email }}` — لا `{{ $json.email }}`

## الأمان — 5 طبقات

| الطبقة | القوة |
|---|---|
| مسار عشوائي | ضعيفة وحدها |
| **Header Auth** | ✅ الحد الأدنى |
| Basic Auth | جيدة |
| **HMAC توقيع** | ✅✅ الأقوى |
| **تحقق من المحتوى** | ✅ إلزامية دائمًا |

## نمط الاستقبال الصحيح

```
[Webhook]
   ▼
[تحقق] ──خطأ──► [Respond 400]
   ▼ صح
[حفظ خام في القاعدة]
   ▼
[Respond 200] ← ⚡ رُدّ بسرعة
   ▼
[Execute Sub-workflow] ← المعالجة الثقيلة هنا
```

⚠️ **الرد البطيء يسبب إعادة إرسال من المرسِل → بيانات مكررة**

## منع التكرار

```
1. Remove Duplicates (removeItemsSeenInPreviousExecutions)
2. UPSERT في القاعدة
3. قيد UNIQUE  ← الأقوى
```

## اختبار

```bash
curl -X POST '<URL>' \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: <SECRET>' \
  -d '{"test":true}' -v
```

## تشخيص

| العَرَض | السبب |
|---|---|
| عمل مرة ثم توقف | Test URL |
| لا يستقبل شيئًا | غير مفعّل |
| البيانات فارغة | ابحث في `body` |
| 404 | المسار خاطئ أو غير مفعّل |
| رسائل مكررة | رد بطيء + بلا idempotency |
