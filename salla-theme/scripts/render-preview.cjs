// Renders the membership Twig component to membership/preview.html with SAMPLE data.
// Usage: NODE_PATH=<dir with twig installed> node salla-theme/scripts/render-preview.cjs
const fs = require('fs');
const path = require('path');
const Twig = require('twig');
Twig.cache(false);

const root = path.resolve(__dirname, '..', '..');
const tpl = fs.readFileSync(path.join(root, 'salla-theme/src/views/components/membership.twig'), 'utf8');

// Sample data only: titles, authors and averages are placeholders until Salla supplies real ones.
const component = {
  monthly_price: 29, yearly_price: 290, discount: 10,
  avg_book_price: 45, avg_shipping_fee: 25,
  monthly_url: '#monthly', yearly_url: '#yearly', signup_url: '#signup',
  products: [
    { name: 'عادات الانتباه', author: 'اسم المؤلف' },
    { name: 'اقتصاد الوقت', author: 'اسم المؤلف' },
    { name: 'عقل المفاوض', author: 'اسم المؤلف' },
    { name: 'ما وراء الإقناع', author: 'اسم المؤلف' },
    { name: 'فن السيطرة والتلاعب الرقمي', author: 'اسم المؤلف' },
  ],
};

const body = Twig.twig({ data: tpl }).render({ component });

const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>آفاق+ | خصم 10% وشحن مجاني على الكتب من آفاق الفكر</title>
<meta name="description" content="اشترك في آفاق+ من 29 ر.س شهرياً واحصل على خصم 10% على كل كتاب وشحن مجاني على كل طلب، مع الإصدارات الجديدة قبل نزولها. أو ابدأ بحساب مجاني.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Inter:wght@400;500;700&family=Noto+Kufi+Arabic:wght@500;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/design-tokens.css">
<link rel="stylesheet" href="../salla-theme/src/assets/styles/membership.css">
<style>
  body { margin: 0; background: var(--color-canvas); font-family: var(--font-sans); color: var(--color-ink); }
  .pv-note { margin: 0; background: var(--color-soft-cloud); color: var(--color-ash); font-size: 12px; text-align: center; padding: 6px 16px; }
  .pv-bar { display: flex; align-items: center; gap: 32px; max-width: 1440px; margin: 0 auto; padding: 18px clamp(16px, 4vw, 48px); box-shadow: var(--shadow-inset-hairline); font-size: 16px; font-weight: 500; }
  .pv-bar b { font-weight: 700; font-size: 20px; margin-inline-end: auto; }
  .pv-bar a { color: inherit; text-decoration: none; }
  .pv-bar a[aria-current] { text-decoration: underline; text-underline-offset: 6px; }
  @media (max-width: 767px) { .pv-bar a:not([aria-current]) { display: none; } }
</style>
</head>
<body>
<p class="pv-note">معاينة ببيانات تجريبية: عناوين الكتب والمؤلفين ومتوسط سعر الكتاب (45 ر.س) والشحن (25 ر.س) أمثلة، والأسعار ونسبة الخصم مقترحة وغير مؤكدة.</p>
<nav class="pv-bar" aria-label="القائمة الرئيسية"><b>آفاق الفكر</b><a href="#">الكتب</a><a href="#">جديد</a><a href="#">الأكثر مبيعاً</a><a href="#">العروض</a><a href="#" aria-current="page">آفاق+</a></nav>
<main>
${body}
</main>
<script src="../salla-theme/src/assets/js/membership.js"></script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'membership/preview.html'), html);
console.log('wrote membership/preview.html');
