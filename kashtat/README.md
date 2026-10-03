# الكشتات

منصة حجز أماكن الكشتات والمخيمات والشاليهات في السعودية.

## التشغيل المحلي

```bash
cp .env.example .env.local   # ثم ضع رابط ومفتاح Supabase
pnpm install
pnpm dev        # http://localhost:3000
```

| الأمر | الوظيفة |
|---|---|
| `pnpm dev` | التشغيل للتطوير |
| `pnpm build` | بناء الإنتاج |
| `pnpm lint` | فحص ESLint |
| `pnpm typecheck` | فحص TypeScript |
| `pnpm test` | اختبارات Vitest |
| `pnpm format` | تنسيق Prettier |

## البنية

- `src/app/globals.css`: رموز الهوية (ألوان الثيمين، الخطوط، الزوايا)، ومنها أصناف Tailwind مثل `bg-surface` و`text-brand` و`text-display-lg`
- `src/components/ui/`: المكوّنات الأساسية (Button، Input، Select، Badge، Card، Modal، DatePicker، Skeleton، Toast، ThemeToggle)
- `src/lib/`: أدوات مشتركة (التواريخ، حالات الحجز، الثيم)
- `/styleguide`: صفحة مراجعة كل المكوّنات

## قاعدة البيانات (Supabase)

المشروع: `kashta-platform` (المعرّف `oxsvckojqphiunldgenp`، الخطة المجانية).

- **الجداول الأساسية:** `places`، `cities`، `amenities`، `addons`، `bookings`، `reviews`، `profiles`
- **المبالغ بالهللة** (100 هللة = 1 ر.س)، وتُعرض عبر `formatSar`
- **منع تداخل الحجوزات** على مستوى القاعدة: قيد `bookings_no_overlap` على فترة الحجز مع وقت التجهيز
- **إنشاء الحجز** عبر الدالة `create_booking`، وهي تحسب السعر من الجدول وليس من المتصفح
- **الصلاحيات (RLS)** مفعّلة على كل الجداول: الأماكن المنشورة عامة، والحجوزات لأطرافها فقط
- الكود في `src/lib/supabase/` و`src/lib/db/`

## الثيم

الداكن هو الأساسي. اختيار المستخدم يُحفظ في `localStorage` ويُطبَّق قبل الرسم لتجنب الوميض.

## المراحل

- [x] 1. الأساس والهوية
- [x] 2. الصفحة الرئيسية
- [x] 3. قاعدة البيانات (Supabase)
- [x] 4. البحث وصفحة المكان
- [ ] 5. الحجز والدفع (Moyasar)
- [ ] 6. لوحة المالك
- [ ] 7. لوحة الأدمن
- [ ] 8. SEO والأداء
- [ ] 9. الجودة والاختبارات
- [ ] 10. الاستضافة والنشر
