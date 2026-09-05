# 🛡️ مخطط: Error Workflow

> ⭐ **أعلى عائد لأقل جهد في المنهج كله.**
> نصف ساعة عمل تعطيك رؤية كاملة على كل أنظمتك.
> **ابنه مرة واحدة، واربطه بكل workflows الإنتاج.**

---

## البنية

```
[Error Trigger]  (n8n-nodes-base.errorTrigger v1)
      │
      ▼
[Set: استخراج التفاصيل]
      │
      ▼
[Postgres: تسجيل في error_log]
      │
      ▼
[Switch: تصنيف الخطورة]
   ├─ حرج  ─► [تنبيه فوري: تيليجرام/هاتف]
   ├─ عالٍ  ─► [إشعار: بريد]
   └─ عادي ─► [تسجيل فقط]
```

## البيانات المتاحة من Error Trigger

| الحقل | الوصف |
|---|---|
| اسم الـ workflow | أي نظام فشل |
| العقدة الفاشلة | أين بالضبط |
| رسالة الخطأ | ماذا حدث |
| معرّف التنفيذ | للرجوع |
| البيانات وقت الفشل | للتشخيص |

## عقدة Set — التفاصيل

| الحقل | القيمة |
|---|---|
| `workflow_name` | `{{ $json.workflow.name }}` |
| `node_name` | `{{ $json.execution.lastNodeExecuted }}` |
| `error_message` | `{{ $json.execution.error.message }}` |
| `execution_id` | `{{ $json.execution.id }}` |
| `occurred_at` | `{{ $now.toISO() }}` |

## تصنيف الخطورة

```javascript
{{
  $json.error_message.includes('401') ||
  $json.error_message.includes('database') ||
  $json.workflow_name.includes('Payment')
    ? 'critical'
    : $json.error_message.includes('429') ||
      $json.error_message.includes('timeout')
        ? 'high'
        : 'normal'
}}
```

> 💡 **`401` مصنَّف حرجًا** لأنه لا يُصلح نفسه بالوقت — يحتاج تدخلًا بشريًا فوريًا، وقد يعني توقف تكامل كامل.

## جدول السجل

```sql
CREATE TABLE error_log (
  id            BIGSERIAL PRIMARY KEY,
  workflow_name TEXT NOT NULL,
  node_name     TEXT,
  error_message TEXT NOT NULL,
  execution_id  TEXT,
  severity      TEXT NOT NULL DEFAULT 'normal',
  resolved      BOOLEAN NOT NULL DEFAULT FALSE,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_err_unresolved ON error_log(resolved, occurred_at DESC)
  WHERE resolved = FALSE;
```

## قالب رسالة التنبيه

```
🚨 فشل في الأتمتة

النظام:   {{ $json.workflow_name }}
العقدة:   {{ $json.node_name }}
الخطأ:    {{ $json.error_message }}
الوقت:    {{ $json.occurred_at }}
التنفيذ:  {{ $json.execution_id }}
الخطورة:  {{ $json.severity }}
```

---

## 🫀 Heartbeat — المكمّل الإلزامي

> **Error Workflow يلتقط الأخطاء. لكن إن توقف النظام تمامًا فلا يقع خطأ أصلًا.**

```
[Schedule Trigger: كل ساعة]
      ▼
[Postgres: SELECT COUNT(*) FROM leads
           WHERE created_at > NOW() - INTERVAL '6 hours']
      ▼
[IF: count = 0]
   └─ true ─► [🚨 تنبيه: النظام صامت منذ 6 ساعات]
```

⚠️ **اضبط الفترة حسب المعدل الطبيعي.** نظام يستقبل عميلًا أسبوعيًا لا يُنبَّه بعد 6 ساعات صمت — وإلا صار التنبيه ضوضاء يتجاهلها الجميع.

> 🧠 **التنبيه الذي يُتجاهَل أسوأ من عدم وجود تنبيه** — لأنه يعطي شعورًا زائفًا بالتغطية.

---

## الربط

**إعدادات كل workflow إنتاجي → Error Workflow → اختر هذا الـ workflow**

```
[ ] Error Workflow مبني
[ ] مرتبط بكل workflows الإنتاج
[ ] التنبيهات مُختبَرة بفشل متعمد
[ ] Heartbeat مبني ومضبوط
[ ] عتبات التنبيه واقعية (لا ضوضاء)
```
