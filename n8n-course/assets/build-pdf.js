#!/usr/bin/env node
/**
 * build-pdf.js — يحوّل منهج n8n Automation Mastery إلى PDF عربي (RTL).
 *
 * المتطلبات:
 *   npm install marked
 *   Chromium (يبحث عنه تلقائيًا، أو مرّره عبر CHROME_PATH)
 *
 * الاستخدام:
 *   node build-pdf.js                 # ينتج N8N_AUTOMATION_MASTERY.pdf
 *   node build-pdf.js --html-only     # ينتج HTML فقط (للطباعة اليدوية من المتصفح)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const COURSE_DIR = path.resolve(__dirname, '..');
const SRC  = path.join(COURSE_DIR, 'N8N_AUTOMATION_MASTERY.md');
const HTML = path.join(COURSE_DIR, 'assets', 'N8N_AUTOMATION_MASTERY.html');
const PDF  = path.join(COURSE_DIR, 'N8N_AUTOMATION_MASTERY.pdf');

let marked;
try {
  ({ marked } = require('marked'));
} catch {
  console.error('✗ الحزمة "marked" غير مثبّتة.\n  شغّل: npm install marked');
  process.exit(1);
}

if (!fs.existsSync(SRC)) {
  console.error(`✗ الملف المصدر غير موجود: ${SRC}`);
  process.exit(1);
}

// ── التنسيق: RTL كامل + خطوط عربية + ألوان تعمل في الطباعة ──────────────
const CSS = `
/* خطوط الويب اختيارية: إن تعذّر تحميلها (بلا إنترنت / خلف بروكسي)
   تعمل البدائل المحلية أدناه وتُرسم العربية بشكل سليم. */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap');

:root {
  --ink:#1a1a1a; --muted:#5a5a5a; --line:#d8d8d8; --bg-soft:#f6f7f9;
  --accent:#0b6b5e; --warn:#b45309; --danger:#b91c1c; --ok:#15803d;
}

* { box-sizing: border-box; }

body {
  font-family:'Tajawal','Noto Naskh Arabic','Noto Sans Arabic','Amiri',
              'Segoe UI','Dubai','Geeza Pro',
              'FreeSerif','DejaVu Sans',sans-serif;
  direction: rtl; text-align: right;
  color: var(--ink); background:#fff;
  font-size: 10.5pt; line-height: 1.85;
  margin: 0; padding: 0;
}

/* ── العناوين ── */
h1,h2,h3,h4 { font-weight:700; line-height:1.4; margin:1.4em 0 .6em; }
h1 { font-size:22pt; color:var(--accent); border-bottom:3px solid var(--accent);
     padding-bottom:.3em; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size:16pt; color:var(--accent); border-bottom:1px solid var(--line);
     padding-bottom:.25em; page-break-after: avoid; }
h3 { font-size:13pt; page-break-after: avoid; }
h4 { font-size:11.5pt; color:var(--muted); page-break-after: avoid; }

p { margin:.55em 0; }

/* ── الجداول ── */
table {
  width:100%; border-collapse:collapse; margin:1em 0;
  font-size:9.5pt; page-break-inside: avoid;
}
th,td { border:1px solid var(--line); padding:7px 10px; text-align:right; vertical-align:top; }
th { background:var(--accent); color:#fff; font-weight:700; }
tr:nth-child(even) td { background:var(--bg-soft); }

/* ── الكود ── */
code {
  font-family:'IBM Plex Mono','DejaVu Sans Mono','FreeMono',monospace; font-size:9pt;
  background:var(--bg-soft); padding:1.5px 5px; border-radius:3px;
  direction:ltr; unicode-bidi:embed; display:inline-block;
}
pre {
  background:#1e1e2e; color:#e6e6e6; padding:12px 14px; border-radius:6px;
  overflow-x:auto; direction:ltr; text-align:left;
  font-size:8.5pt; line-height:1.6; page-break-inside:avoid;
  border-right:4px solid var(--accent);
}
pre code { background:none; color:inherit; padding:0; display:block; }

/* ── الاقتباسات (Callouts) ── */
blockquote {
  margin:1em 0; padding:.7em 1em;
  border-right:4px solid var(--accent);
  background:var(--bg-soft); border-radius:0 6px 6px 0;
  page-break-inside: avoid;
}
blockquote p { margin:.3em 0; }

/* ── القوائم ── */
ul,ol { padding-right:1.5em; padding-left:0; margin:.5em 0; }
li { margin:.25em 0; }

/* ── الفواصل ── */
hr { border:none; border-top:1px solid var(--line); margin:2em 0; }

/* ── details/summary (الإجابات) ── */
details {
  margin:.8em 0; padding:.6em .9em;
  border:1px solid var(--line); border-radius:6px; background:var(--bg-soft);
  page-break-inside: avoid;
}
summary { font-weight:700; cursor:pointer; color:var(--accent); }
/* في PDF نفتح كل الإجابات ليراها القارئ */
details[open] summary { margin-bottom:.5em; }

/* ── صفحة الغلاف ── */
.cover {
  page-break-after: always; text-align:center;
  padding-top: 22vh;
}
.cover h1 {
  font-size:34pt; border:none; color:var(--accent);
  margin-bottom:.15em; page-break-before: avoid;
}
.cover .sub { font-size:15pt; color:var(--muted); margin-bottom:2.5em; }
.cover .meta {
  display:inline-block; text-align:right; font-size:10.5pt;
  border:1px solid var(--line); border-radius:8px; padding:1em 1.6em;
  background:var(--bg-soft);
}
.cover .meta div { margin:.35em 0; }

/* ── الطباعة ── */
@page { size:A4; margin:18mm 15mm 20mm; }
@media print {
  body { font-size:10pt; }
  a { color:var(--ink); text-decoration:none; }
  h1,h2,h3 { page-break-after: avoid; }
  table,pre,blockquote,details { page-break-inside: avoid; }
}
`;

// ── التحويل ─────────────────────────────────────────────────────────────
const md = fs.readFileSync(SRC, 'utf8');

marked.setOptions({ gfm: true, breaks: false, headerIds: true, mangle: false });
let body = marked.parse(md);

// افتح كل عناصر <details> ليظهر محتواها في الـ PDF
body = body.replace(/<details>/g, '<details open>');

const today = new Date().toISOString().slice(0, 10);

const cover = `
<div class="cover">
  <h1>n8n Automation Mastery</h1>
  <div class="sub">من الصفر إلى بناء أنظمة أتمتة احترافية</div>
  <div class="meta">
    <div><strong>الإصدار المرجعي:</strong> n8n 2.37.10</div>
    <div><strong>تاريخ البناء:</strong> ${today}</div>
    <div><strong>المستوى:</strong> مبتدئ ← Automation Architect</div>
    <div><strong>الوحدات:</strong> 15 وحدة · 5 مستويات · 6 مشاريع</div>
  </div>
</div>`;

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>n8n Automation Mastery</title>
<style>${CSS}</style>
</head>
<body>
${cover}
${body}
</body>
</html>`;

fs.mkdirSync(path.dirname(HTML), { recursive: true });
fs.writeFileSync(HTML, html, 'utf8');
console.log(`✓ HTML: ${HTML}`);

if (process.argv.includes('--html-only')) {
  console.log('  (تم تخطي PDF بطلبك — افتح الملف في المتصفح واطبعه كـ PDF)');
  process.exit(0);
}

// ── PDF عبر Chromium ────────────────────────────────────────────────────
const candidates = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const chrome = candidates.find(p => { try { return fs.existsSync(p); } catch { return false; } });

if (!chrome) {
  console.error('✗ لم يُعثر على Chromium.');
  console.error('  مرّر المسار: CHROME_PATH=/path/to/chrome node build-pdf.js');
  console.error(`  أو افتح ${HTML} في متصفحك واطبعه كـ PDF (النتيجة مطابقة).`);
  process.exit(1);
}

console.log(`  المتصفح: ${chrome}`);
try {
  execFileSync(chrome, [
    '--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--virtual-time-budget=30000',        // انتظر تحميل الخطوط
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${PDF}`,
    '--no-pdf-header-footer',
    `file://${HTML}`,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout: 180000 });

  const kb = (fs.statSync(PDF).size / 1024).toFixed(0);
  console.log(`✓ PDF: ${PDF}  (${kb} KB)`);
} catch (e) {
  console.error('✗ فشل توليد PDF:', e.message);
  console.error(`  البديل: افتح ${HTML} في المتصفح → طباعة → حفظ كـ PDF`);
  process.exit(1);
}
