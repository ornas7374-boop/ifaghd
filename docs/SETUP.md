# تشغيل النظام من الصفر

## المتطلبات

| المتطلب | الإصدار | ملاحظة |
|---|---|---|
| Node.js | 20.10+ | مختبر على 22 |
| PostgreSQL | 14+ | يحتاج `pgcrypto` و`pg_trgm` |
| حساب WhatsApp Business | — | عبر Meta Developer Console |
| مفتاح LLM | — | Anthropic أو OpenAI |
| n8n | 1.x | اختياري — النظام يعمل بدونه |

---

## الطريقة الأولى: Docker (الأسرع)

```bash
git clone <repo> && cd ifaghd
cp .env.example .env
```

عدّل `.env` واملأ على الأقل:

```bash
POSTGRES_PASSWORD=$(openssl rand -hex 16)
INTERNAL_API_KEY=$(openssl rand -hex 32)
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
ANTHROPIC_API_KEY=sk-ant-...
WHATSAPP_VERIFY_TOKEN=$(openssl rand -hex 16)
WHATSAPP_APP_SECRET=...      # من Meta
WHATSAPP_ACCESS_TOKEN=...    # من Meta
WHATSAPP_PHONE_NUMBER_ID=... # من Meta
```

ثم:

```bash
docker compose up -d
docker compose exec agent npm run migrate
docker compose exec agent npm run seed     # بيانات تجريبية — تخطّاها في الإنتاج
curl http://localhost:3000/readyz
```

---

## الطريقة الثانية: تشغيل محلي

### ١. قاعدة البيانات

```bash
createuser ifaghd --pwprompt
createdb ifaghd --owner ifaghd
```

الامتدادات (`pgcrypto`, `pg_trgm`) تُنشأ تلقائياً في أول ترحيل، لكنها تحتاج
صلاحية إنشاء امتدادات. على Postgres مُدار قد تحتاج تشغيلها يدوياً كمسؤول:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### ٢. الإعداد

```bash
npm install
cp .env.example .env
# املأ DATABASE_URL و INTERNAL_API_KEY و مفتاح الـLLM ومتغيرات واتساب
```

توليد مفتاح داخلي:

```bash
openssl rand -hex 32
```

### ٣. الترحيلات

```bash
npm run migrate
```

الترحيلات أمامية فقط، وكل ملف يُنفّذ مرة واحدة داخل معاملة، وتُحفظ بصمة SHA-256
لكل ملف — تعديل ترحيل بعد تطبيقه يوقف التشغيل بدل أن يمرّ صامتاً.

### ٤. المستأجر وقاعدة المعرفة

**للتجربة** (يُنشئ متجراً وهمياً بمنتجات وطلبات):

```bash
npm run seed
```

**للإنتاج** (قاعدة المعرفة فقط، بدون بيانات وهمية):

```bash
npm run seed -- --kb-only --tenant your-store-slug
```

ثم أنشئ المستأجر وربط الرقم:

```sql
INSERT INTO tenants (slug, name, settings) VALUES (
  'your-store', 'اسم متجرك',
  '{"brandName":"اسم متجرك","supportHours":"٩ص - ٩م","supportPhone":"920000000"}'::jsonb
);

INSERT INTO channel_accounts (tenant_id, channel, external_id, display_name)
SELECT id, 'whatsapp', '<PHONE_NUMBER_ID من Meta>', 'واتساب المتجر'
FROM tenants WHERE slug = 'your-store';
```

`external_id` هو `phone_number_id` من Meta. هذا هو الربط الذي يجعل ويبهوك واحد
يخدم عدة شركات.

### ٥. التشغيل

```bash
npm run dev     # تطوير، مع إعادة التحميل
# أو
npm run build && npm start
```

تحقق:

```bash
curl http://localhost:3000/readyz
curl http://localhost:3000/info
```

---

## تعبئة بيانات المتجر

الوكيل يقرأ الطلبات والمنتجات من جداول `orders` و`products`. أمامك خياران:

**أ. مزامنة من نظامك** — اكتب مهمة دورية تكتب في هذين الجدولين. الوكيل لا يكتب فيهما
إطلاقاً (لا يملك صلاحية `order:write`)، فالمزامنة أحادية الاتجاه وآمنة.

**ب. الربط بـAPI خارجي** — استبدل جسم الدوال في `src/db/repositories/commerce.ts`
باستدعاء API متجرك. توقيع الدوال هو العقد؛ الأدوات فوقها لا تتغير.

في الحالتين احتفظ بالتحقق من `customer_id` — هو ما يمنع عميلاً من رؤية طلب غيره.

---

## تحرير قاعدة المعرفة

ثلاث طرق، كلها بدون تعديل كود:

**١. ملف JSON** — عدّل `db/seeds/knowledge-base.ar.json` ثم:

```bash
npm run seed -- --kb-only --tenant your-store
```

المطابقة على `(tenant_id, title)` فالتحديث في المكان ولا يُنشئ تكراراً.

**٢. الـAPI**

```bash
curl -X POST http://localhost:3000/internal/v1/knowledge \
  -H "x-api-key: $INTERNAL_API_KEY" -H 'content-type: application/json' \
  -d '{
    "tenant_id": "<uuid>",
    "category": "shipping",
    "title": "الشحن السريع",
    "question": "عندكم توصيل سريع؟",
    "answer": "التوصيل السريع متاح داخل الرياض خلال ٤ ساعات برسوم ٣٥ ريال.",
    "keywords": ["توصيل سريع","نفس اليوم","سريع"],
    "created_by": "ops@your-store.com"
  }'
```

**٣. SQL مباشرة** — `INSERT INTO knowledge_base ...`

التغييرات تظهر في الرسالة التالية فوراً. كل تعديل يُحفظ في `knowledge_base_revisions`
مع النسخة السابقة، فيمكن تتبّع من غيّر ماذا والرجوع.

**نصيحة:** حقل `keywords` هو أهم عامل لجودة البحث بالعربي. اكتب فيه الصيغ التي
يستخدمها العملاء فعلاً ("وين طلبي"، "بكم"، "ابغى ارجع")، لا الصيغة الرسمية.
