# n8n Automation Mastery — نقطة الدخول

> **المنهج الكامل موجود في:** [`n8n-course/N8N_AUTOMATION_MASTERY.md`](n8n-course/N8N_AUTOMATION_MASTERY.md)
>
> هذا الملف فهرس فقط. المحتوى الكامل في مجلد `n8n-course/` لتجنّب نسخة مكررة تتقادم.

**آخر تحقق تقني:** 5 سبتمبر 2026 · مقابل **n8n 2.37.10**

---

## من أين تبدأ؟

```
هل بنيتَ workflow في n8n من قبل؟
│
├─ لا ──────────────► n8n-course/N8N_AUTOMATION_MASTERY.md § Module 1
│
└─ نعم ─► هل تستطيع إصلاح خطأ لم تره من قبل، دون AI؟
          │
          ├─ نعم ──► ابدأ من Module 7 (APIs)، وراجع M4–M6 سريعًا
          │
          └─ لا ───► n8n-course/exercises/DEBUGGING_LAB.md  ← ابدأ هنا
```

---

## المحتويات

| الملف | الوصف | الحجم |
|---|---|---|
| [`n8n-course/README.md`](n8n-course/README.md) | تحليل الجمهور · معمارية المنهج · نظام التقييم | 216 سطر |
| [`n8n-course/N8N_AUTOMATION_MASTERY.md`](n8n-course/N8N_AUTOMATION_MASTERY.md) | **المنهج الكامل** — 15 وحدة · 5 مستويات | 3,834 سطر |
| [`n8n-course/N8N_AUTOMATION_MASTERY.pdf`](n8n-course/N8N_AUTOMATION_MASTERY.pdf) | نسخة PDF عربية (RTL) | 114 صفحة |
| [`n8n-course/exercises/DEBUGGING_LAB.md`](n8n-course/exercises/DEBUGGING_LAB.md) | 12 تمرين تشخيص بأخطاء متعمدة | 455 سطر |
| [`n8n-course/projects/`](n8n-course/projects/) | 6 مشاريع متدرجة بمواصفات تسليم كاملة | 1,505 سطر |
| [`n8n-course/cheat-sheets/`](n8n-course/cheat-sheets/) | 10 مراجع سريعة للاستخدام أثناء العمل | 871 سطر |
| [`n8n-course/templates/`](n8n-course/templates/) | 5 قوالب عمل جاهزة للعملاء | 491 سطر |

---

## خارطة الطريق

| المستوى | الوحدات | القدرة المكتسَبة | المشروع |
|---|---|---|---|
| **1 — Foundations** | M1 الأتمتة · M2 الواجهة · M3 Triggers | workflows بسيطة بمشغّل صحيح | Project 1 |
| **2 — Data Fluency** | M4 JSON · M5 Expressions · M6 Core Nodes | تحكم كامل في البيانات | Project 2 |
| **3 — Integration** | M7 APIs · M8 Integrations · M9 Databases | ربط أي API وأي قاعدة بيانات | Project 3 |
| **4 — AI & Resilience** | M10 AI · M11 Errors · M12 Security | أنظمة ذكية لا تنهار وآمنة | Projects 4–5 |
| **5 — Production** | M13 Production · M14 Deploy · M15 Architecture | نشر وتصميم أنظمة حقيقية | Capstone |

---

## إعادة توليد الـ PDF

```bash
cd n8n-course/assets
npm install marked
node build-pdf.js
```

يبحث السكربت عن Chromium تلقائيًا. لتحديد مسار مخصص:
```bash
CHROME_PATH=/path/to/chrome node build-pdf.js
```

بلا Chromium، ولّد HTML فقط واطبعه من المتصفح (نتيجة مطابقة):
```bash
node build-pdf.js --html-only
```

> السكربت يعمل **بلا إنترنت** — خطوط الويب اختيارية وله بدائل محلية تدعم العربية.
