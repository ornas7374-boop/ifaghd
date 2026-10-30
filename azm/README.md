# عَزم

تطبيق ويب شخصي (RTL، Mobile-first) لكسر التسويف وبناء الصلابة الذهنية.
Next.js (App Router) + TypeScript + Tailwind CSS v4. البيانات محلية في المتصفح (localStorage).

## التشغيل

```bash
cd azm
npm install
npm run dev        # http://localhost:3000
```

للاختبار السريع: أضف `?fast=1` للرابط (مثل `/stuck?fast=1`) وكل دقيقة تصير ثانية.

## الهيكل

```
src/
  app/                 الصفحات: / (اليوم)، /stuck (الطوارئ)، /plans، /timer، /log، /insights
  components/
    stuck/             خطوات «أنا عالق الحين»
    today/             بطاقات الصفحة الرئيسية
    plans/             خطط إذا–فإن والمسارات
    timer/             بومودورو ونافذة مونستر
    log/               سجل التسويف والتحليل
    ui/                أزرار، حقول، أيقونات
  lib/
    storage/           طبقة التخزين (adapter) — بدّلها هنا فقط
    db.ts              المستودعات: الدوال الوحيدة اللي تقرأ وتكتب البيانات
    stats.ts           حسابات التحليل (دوال صافية)
    timer.ts           بدء/إنهاء/إيقاف المؤقت
    content/           الاقتباسات، برنامج الـ30 يوم، المشاعر، محفزات الصلاة
    hooks/             useStored، useCountdown
```

## التبديل لـ Supabase لاحقًا

اكتب كلاس جديد يطبّق `StorageAdapter` (read / write / remove) فوق جدول واحد:

```sql
create table azm_kv (key text primary key, value jsonb not null, updated_at timestamptz default now());
```

ثم غيّر سطر واحد في `src/lib/storage/index.ts`. المكونات ما تحتاج أي تعديل.
