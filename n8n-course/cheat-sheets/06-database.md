# 🗄️ Database Cheat Sheet

📌 Postgres node v2.7 · Data Table v1.1

## اختيار المخزن

| الخيار | متى |
|---|---|
| **Data Table** (مدمج) | نماذج أولية · بيانات بسيطة |
| **Google Sheets** | العميل يريد التحرير المباشر |
| **Postgres/Supabase** | ✅ الإنتاج |
| **PGVector** | RAG والبحث الدلالي |

⚠️ **Data Table: لا يوجد `getAll`** — استخدم `get` مع `returnAll: true`
⚠️ **معرّفات صفوف Data Table تُولَّد تلقائيًا** — لا تُنشئ عمود `id`

## الأنواع

| النوع | الاستخدام |
|---|---|
| `TEXT` | نصوص |
| `INTEGER` / `BIGINT` | أعداد صحيحة |
| **`DECIMAL(10,2)`** | ✅ **النقود** — لا `FLOAT` أبدًا |
| `BOOLEAN` | صح/خطأ |
| **`TIMESTAMPTZ`** | ✅ تاريخ **مع المنطقة الزمنية** |
| `JSONB` | JSON مرن وقابل للفهرسة |
| `UUID` | معرّف عالمي |

## CRUD

```sql
INSERT INTO leads (name, email) VALUES ('محمد','m@x.com');
SELECT * FROM leads WHERE budget > 50000 ORDER BY created_at DESC LIMIT 10;
UPDATE leads SET status='contacted' WHERE id=42;
DELETE FROM leads WHERE id=42;

-- ⭐ UPSERT — الأهم في الأتمتة
INSERT INTO leads (email, name) VALUES ('m@x.com','محمد')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW();
```

⚠️ **`UPDATE`/`DELETE` بلا `WHERE` يطال كل الصفوف**
✅ **اختبر بـ `SELECT` بنفس الشرط أولًا**

## القيود

```sql
email TEXT UNIQUE NOT NULL              -- منع التكرار
lead_id BIGINT REFERENCES leads(id)
        ON DELETE CASCADE               -- حذف تابع
qty INTEGER CHECK (qty > 0)             -- تحقق
status TEXT NOT NULL DEFAULT 'new'      -- قيمة افتراضية
CONSTRAINT c CHECK (a IS NOT NULL OR b IS NOT NULL)
```

## الفهارس

```sql
CREATE INDEX idx_status ON leads(status);
CREATE INDEX idx_created ON leads(created_at DESC);
CREATE INDEX idx_open ON leads(status) WHERE status != 'closed';  -- جزئي
```

💡 **افهرس أعمدة `WHERE` و `JOIN` و `ORDER BY`** — لا كل الأعمدة

## 🔐 SQL Injection

```
❌ خطر: WHERE email = '{{ $json.email }}'
✅ آمن: WHERE email = $1   + المعامل في قائمة منفصلة
```

## قواعد التصميم

| القاعدة | السبب |
|---|---|
| `DECIMAL` للنقود | `FLOAT` يسبب أخطاء تقريب |
| `TIMESTAMPTZ` دائمًا | تجنّب فوضى المناطق الزمنية |
| خزّن السعر وقت الشراء | الأسعار تتغير |
| قيود في القاعدة لا المنطق فقط | القاعدة لا تُنسى |
| فصل الكيانات (contact ≠ lead) | نفس الشخص عدة طلبات |
