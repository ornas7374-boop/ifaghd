# Webora — Marketing Site

موقع Landing احترافي لـ Webora — استوديو تصميم مواقع premium ثنائي اللغة. مبني بـ **Next.js 16 · App Router · Tailwind v4 · Framer Motion** بالكامل حسب مواصفات `Webora Brand Book v1.0`.

## المواصفات

- **الستاك:** Next.js 16.3.4 · React 19 · TypeScript · Tailwind v4 · Framer Motion 11
- **اللغة الافتراضية:** العربية (RTL) — كل قسم يحمل توقيع إنجليزي مكافئ
- **الخطوط:** Space Grotesk · IBM Plex Sans Arabic · Inter · JetBrains Mono (Google Fonts via `next/font`)
- **الألوان:** Deep Ink `#0A0E27` · Electric Violet `#6D28D9` · Neon Mint `#3EE8B4`
- **Responsive:** Mobile-first (خ ~360px → 4K)
- **الأداء:** SSR + استخدام `next/font` للـ CLS = 0 · تحميل خطوط self-host

## الأقسام

| # | القسم | المحتوى |
|---|---|---|
| 01 | **Hero** | Aura signature · وعد الـ 7 أيام · CTAs · متحف عائم لصفحة موقع |
| 02 | **Problem** | 3 خيارات سيئة يواجهها صاحب العمل (وكالات · DIY · فريلانسر) |
| 03 | **Solution** | 3 ركائز: SPEED · PRICE · BILINGUAL + Tagline |
| 04 | **Process** | 4 خطوات: Brief → Design → Build → Launch + Progress rail |
| 05 | **Pricing** | LAUNCH / GROW / SCALE + CARE Subscription |
| 06 | **Market** | 6 قطاعات + 3 إحصائيات سوق حقيقية |
| 07 | **Traction** | 4 KPIs + Marquee شعارات + Testimonial |
| 08 | **FAQ** | 6 أسئلة شائعة قابلة للطيّ (accordion) |
| 09 | **CTA** | نموذج تواصل كامل (اسم، شركة، إيميل، ميزانية، جدول زمني) |
| 10 | **Footer** | Logo bilingual + Nav + Contact + Social |

## التشغيل محلياً

```bash
cd webora-site
npm install
npm run dev
```

افتح `http://localhost:3000`.

## التصميم

كل التصميم مأخوذ من `Webora Brand Book v1.0`:

- **Logo:** `Web` + النقطة النعناعية بحلقة + `ra` — تُعرض في الـ Nav والـ Footer والـ CTA
- **Aura Dot:** المكوّن التوقيعي — mint dot داخل mint ring مع halo متحرك
- **Type scale:** Display (56–76px) · H2 (32–48px) · Body (16–18px) · Mono للأرقام والـ labels
- **Motion:** Framer Motion + `whileInView` + `viewport={{ once: true }}` — بدون هجوم على الأداء
- **Backdrops:** Drifting radial gradients (violet + mint) + شبكة خفيفة

## البنية

```
webora-site/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx      # RTL, fonts, metadata
│   │   ├── page.tsx        # الصفحة كاملة (composition)
│   │   └── globals.css     # design tokens + utilities + animations
│   └── components/
│       ├── AuraDot.tsx     # التوقيع البصري
│       ├── Logo.tsx        # Wordmark
│       ├── Nav.tsx         # Sticky nav + mobile menu
│       ├── Section.tsx     # Shared shell + header
│       ├── Hero.tsx
│       ├── Problem.tsx
│       ├── Solution.tsx
│       ├── Process.tsx
│       ├── Pricing.tsx
│       ├── Market.tsx
│       ├── Traction.tsx
│       ├── FAQ.tsx
│       ├── CTA.tsx         # نموذج مع validation + success state
│       └── Footer.tsx
```

## ما هو غير مبني (بعد)

النموذج في CTA يعمل بشكل بصري (يظهر success state). لربطه بـ backend حقيقي:

1. إضافة `/api/contact` route
2. حفظ الطلبات في SQLite (يمكن استعارة نمط `livestock-dashboard/`)
3. إرسال إشعار إلى إيميل عبر Resend / SendGrid
4. أو ربطه بـ webhook إلى Slack / n8n

Optional: `/blog` مع MDX · `/case-studies` · `/en` نسخة إنجليزية كاملة.
