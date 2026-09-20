# Webora Pitch — Motion Video

فيديو Motion Graphics احترافي مبني بـ **Remotion 4** يحوّل الـ Webora Pitch Deck Outline إلى فيديو 1080p قابل للتصدير كـ MP4. الهوية مأخوذة من `Webora Brand Book v1.0` بالكامل — ألوان + خطوط + شعار + نبرة.

## المواصفات

- **الدقة:** 1920 × 1080 (16:9)
- **FPS:** 30
- **المدة الكلية:** ~86 ثانية (15 مشهد)
- **الصوت:** لا يوجد (بحسب الطلب)
- **الخطوط:** Space Grotesk · IBM Plex Sans Arabic · Inter · JetBrains Mono (Google Fonts)
- **الألوان:** Deep Ink `#0A0E27` · Electric Violet `#6D28D9` · Neon Mint `#3EE8B4`

## Scene Timeline

| # | المشهد | المدة | العناصر المتحركة |
|---|---|---|---|
| 01 | Cover | 4s | Aura pulse, wordmark rise, scanline sweep, subtitle reveal |
| 02 | Problem | 6s | Headline type, 3 danger cards cascade, quote fade |
| 03 | Data | 7s | Count-ups (75/83/13.4%), gradient bars grow, source line |
| 04 | Solution | 5s | Aura float, 3 pillars pop, tagline type reveal |
| 05 | How It Works | 6s | Progress rail grows, 4 step cards flip in, secret-sauce reveal |
| 06 | Tiers | 7s | 3 pricing cards slide, GROW floats + glows, CARE banner |
| 07 | Market | 6s | Central persona pulse, 6 industry chips orbit, TAM count-up |
| 08 | Competition | 6s | 2×2 axes draw, quadrant cards land, WEBORA glow + float |
| 09 | Traction | 5s | 4 KPI tiles cascade, logo marquee scrolls, testimonial fade |
| 10 | Model | 6s | Revenue donut animates, unit-economics cards stack in |
| 11 | GTM | 7s | Horizontal timeline draws, 3 phase cards, KPI badges |
| 12 | Financials | 6s | Quarterly bars grow, Y1 total + Y2 target count up |
| 13 | Team | 5s | Founder core scales, freelance roles orbit on ellipse |
| 14 | Ask | 5s | 500K number bloom, 3 track cards slide |
| 15 | Closing | 6s | Massive wordmark centered, tagline type, contact block |

بين كل مشهدين ثمّة تراكب 8 frames لتنعيم الانتقال (cross-fade).

## التشغيل محلياً

```bash
cd webora-video
npm install
npm run studio      # يفتح Remotion Studio على http://localhost:3000
npm run render      # ينتج out/webora-pitch.mp4
npm run still       # لقطة ثابتة من الإطار 60
```

## البنية

```
src/
├── index.ts              # نقطة الدخول Remotion
├── Root.tsx              # تسجيل الـ Composition
├── Video.tsx             # الفيديو الرئيسي — كل الـ 15 مشهد بالتتابع
├── theme.ts              # الألوان + الخطوط + مدد المشاهد
├── fonts.ts              # تحميل خطوط Google
├── utils.ts              # useSpringIn, useCountUp, useReveal, useFloat, fmt
├── components/
│   ├── AuraDot.tsx       # النقطة النعناعية بحلقة — التوقيع البصري
│   ├── Logo.tsx          # Web[Aura]ra + ويبورا
│   ├── Backdrop.tsx      # Deep Ink + violet/mint radials + شبكة خفيفة
│   ├── Card.tsx          # Panel + Chip بأسلوب الـ Brand Book
│   ├── Chrome.tsx        # SceneTag + FooterMark
│   └── Reveal.tsx        # SlideIn + TypeReveal + LineReveal + GrowBar
└── scenes/               # 15 ملف — مشهد لكل واحد
```

## ملاحظة عن الـ Assets

- **لم يُرفق ملف صوت** — الفيديو Motion Graphics صامت بالكامل (كما طُلب).
- **لا توجد بنرات جاهزة** — كل عنصر بصري مُعاد بناؤه كـ SVG/CSS من مواصفات الـ Brand Book بدقة (نفس الألوان، نفس الخطوط، نفس شكل الشعار: "Web" + النقطة النعناعية بحلقة + "ra").
- **الخطوط** تُحمَّل مباشرة من Google Fonts عبر `@remotion/google-fonts` — وهذا ما ينصّ عليه الـ Brand Book نفسه في صفحة Type System.

## تصدير MP4

```bash
npm run render
```

الناتج: `out/webora-pitch.mp4` — H.264 · yuv420p · جاهز لأي منصة (LinkedIn, TikTok, YouTube).
