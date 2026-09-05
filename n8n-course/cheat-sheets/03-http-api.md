# 🌐 HTTP / API Cheat Sheet

## أجزاء الطلب

| الجزء | مثال |
|---|---|
| Method | `POST` |
| URL | `https://api.x.com/v1/leads` |
| Headers | `Authorization: Bearer xxx` |
| Query | `?limit=50&status=active` |
| Body | `{"name":"محمد"}` |

## الأفعال

| الفعل | المعنى | آمن للتكرار |
|---|---|---|
| GET | اقرأ | ✅ |
| POST | أنشئ | ❌ **قد يُنشئ نسخًا عند Retry** |
| PUT | استبدل كاملًا | ✅ |
| PATCH | عدّل جزئيًا | ✅ عادةً |
| DELETE | احذف | ✅ |

## رموز الحالة

| الرمز | المعنى | التصرف |
|---|---|---|
| 200/201/204 | نجح | — |
| **400** | طلب سيئ | راجع شكل البيانات |
| **401** | **هوية** خاطئة | جدّد المفتاح/التوكن |
| **403** | **صلاحية** ناقصة | راجع الـ Scopes |
| **404** | غير موجود | راجع الرابط والمعرّف |
| 409 | تعارض | السجل موجود |
| 422 | قيم غير صالحة | الشكل صحيح والقيم لا |
| **429** | **تجاوز الحد** | **أبطئ — لا تُعد المحاولة** |
| 5xx | خطأ عندهم | أعد المحاولة بتباعد |

💡 **4xx = خطؤك · 5xx = خطؤهم**

## المصادقة

| النوع | الشكل |
|---|---|
| API Key | `X-API-Key: xxx` |
| Bearer | `Authorization: Bearer xxx` |
| Basic | `Authorization: Basic <base64>` |
| OAuth 2.0 | تدفق تفويض — n8n يديره |

🔐 **استخدم Credentials دائمًا — لا تكتب Header يدويًا**
🔐 **لا أسرار في Query Parameters** (تُسجَّل في السجلات)

## Rate Limits

```
[Loop Over Items] (دفعة < الحد)
   └─ loop → [HTTP Request] → [Wait 60s] → رجوع
   └─ done → [متابعة]
```

| Header | المعنى |
|---|---|
| `Retry-After` | انتظر هذه المدة |
| `X-RateLimit-Remaining` | المتبقي |
| `X-RateLimit-Reset` | وقت إعادة التعيين |

⚠️ **Retry على 429 يزيد المشكلة سوءًا**

## Pagination

| النمط | الآلية | نهاية |
|---|---|---|
| Offset | `?offset=0&limit=100` | صفحة أقصر |
| Page | `?page=1&per_page=100` | صفحة فارغة |
| Cursor | `?cursor=abc` | لا cursor |
| Link Header | `rel="next"` | لا next |

⚠️ **ضع حدًا أقصى للصفحات** — لتجنّب حلقة لا نهائية

## قراءة توثيق API جديد

```
1. Base URL          5. Response Example
2. Authentication    6. Rate Limits
3. Endpoints         7. Error Codes
4. Request Example
```

⭐ **اختبر بـ curl قبل n8n** — يعزل مشكلة الـ API عن مشكلة إعدادك

```bash
curl -X POST 'https://api.x.com/v1/leads' \
  -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"name":"test"}' -v
```
