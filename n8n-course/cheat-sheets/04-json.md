# 📦 JSON Cheat Sheet

## الأنواع الستة

| النوع | مثال | ملاحظة |
|---|---|---|
| String | `"نص"` | `"123"` نص لا رقم! |
| Number | `123` | بلا اقتباس |
| Boolean | `true` | صغيرة |
| Null | `null` | موجود وفارغ |
| Object | `{ }` | أزواج مفتاح/قيمة |
| Array | `[ ]` | قائمة مرتبة |

## المسارات

```json
{
  "customer": { "name": "محمد", "contact": { "email": "m@x.com" } },
  "order": { "items": [ {"sku":"A"}, {"sku":"B"} ] }
}
```

| القيمة | المسار |
|---|---|
| `"محمد"` | `customer.name` |
| `"m@x.com"` | `customer.contact.email` |
| `"A"` | `order.items[0].sku` |
| `"B"` | `order.items[1].sku` |
| العدد | `order.items.length` |

💡 **`.` للـ Object · `[n]` للـ Array (يبدأ من 0)**

## ⭐ Items مقابل Array — أهم فرق في n8n

```javascript
// ثلاثة items → العقدة التالية تعمل 3 مرات
[ {"n":"أ"}, {"n":"ب"}, {"n":"ج"} ]

// item واحد فيه مصفوفة → تعمل مرة واحدة
[ {"names":["أ","ب","ج"]} ]
```

| التحويل | العقدة |
|---|---|
| item فيه مصفوفة → items | **Split Out** |
| items → item فيه مصفوفة | **Aggregate** |
| دمج من **فروع** مختلفة | **Merge** |

## تشخيص

| العَرَض | السبب | الحل |
|---|---|---|
| عملت مرة والمتوقع عدة | item واحد فيه مصفوفة | Split Out |
| عملت عدة والمتوقع مرة | عدة items | Aggregate / Execute Once |
| لم تعمل | 0 items | ارجع للعقدة السابقة |
| `undefined` | مسار/اسم خاطئ | افحص Input |

## الحماية

```javascript
{{ $json.a?.b?.c }}                  // وصول آمن
{{ $json.a?.b ?? 'افتراضي' }}        // بديل
{{ Number($json.x) }}                 // توحيد النوع
```

⚠️ **`"100" > 50` قد يعطي نتيجة غير متوقعة** — النص ليس رقمًا
