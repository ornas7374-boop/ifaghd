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
- **إنشاء الحجز** عبر الدالة `book_now` (تستدعي `create_booking` وتؤكد مباشرة لأنه لا يوجد دفع)، والسعر يُحسب من الجدول وليس من المتصفح
- **الإلغاء** عبر `cancel_my_booking`: لصاحب الحجز فقط وقبل موعده
- **الدخول:** بريد وكلمة مرور عبر Supabase Auth. رابط تأكيد البريد يعود إلى `/auth/callback`، فأضف رابط الموقع إلى Redirect URLs في إعدادات Auth
- **الصلاحيات (RLS)** مفعّلة على كل الجداول: الأماكن المنشورة عامة، والحجوزات لأطرافها فقط
- الكود في `src/lib/supabase/` و`src/lib/db/`

## صور الأماكن

نسخة تدريبية بدون رفع صور: الصور في `public/places/` ومولّدة بالسكربت في `scripts/place-images/`.
المسار في `listing_images.storage_path` يبدأ بـ `/` للصور المحلية، وأي مسار آخر يُقرأ من حاوية `listings` في Supabase Storage.

## الثيم

الداكن هو الأساسي. اختيار المستخدم يُحفظ في `localStorage` ويُطبَّق قبل الرسم لتجنب الوميض.

## المراحل

- [x] 1. الأساس والهوية
- [x] 2. الصفحة الرئيسية
- [x] 3. قاعدة البيانات (Supabase)
- [x] 4. البحث وصفحة المكان
- [x] 5. الحجز (بدون دفع: نسخة تدريبية)
- [x] 6. لوحة المالك (إضافة مكان، حظر فترات، الحجوزات والمستحقات)
- [ ] 7. لوحة الأدمن
- [ ] 8. SEO والأداء
- [ ] 9. الجودة والاختبارات
- [ ] 10. الاستضافة والنشر
