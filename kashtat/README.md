# الكشتات

منصة حجز أماكن الكشتات والمخيمات والشاليهات في السعودية.

## التشغيل المحلي

```bash
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

## الثيم

الداكن هو الأساسي. اختيار المستخدم يُحفظ في `localStorage` ويُطبَّق قبل الرسم لتجنب الوميض.

## المراحل

- [x] 1. الأساس والهوية
- [ ] 2. الصفحة الرئيسية
- [ ] 3. قاعدة البيانات (Supabase)
- [ ] 4. البحث وصفحة المكان
- [ ] 5. الحجز والدفع (Moyasar)
- [ ] 6. لوحة المالك
- [ ] 7. لوحة الأدمن
- [ ] 8. SEO والأداء
- [ ] 9. الجودة والاختبارات
- [ ] 10. الاستضافة والنشر
