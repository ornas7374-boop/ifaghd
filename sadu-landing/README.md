# sadu — صفحة اختبار الفكرة

| الملف | ماذا يفعل |
|---|---|
| `index.html` | الصفحة كاملة (HTML + CSS + JS) بدون مكتبات |
| `apps-script.gs` | يستقبل الأرقام والأحداث في Google Sheets ويحسب نسبة التحويل |

## 1. ربط Google Sheets (حوالي 5 دقائق)

1. أنشئ Google Sheet جديداً باسم `sadu leads`.
2. من القائمة: **Extensions ← Apps Script**.
3. احذف الكود الموجود، والصق محتوى `apps-script.gs`، ثم احفظ.
4. اضغط **Deploy ← New deployment**، واختر النوع **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
5. اضغط Deploy، ووافق على الصلاحيات، ثم انسخ رابط **Web app URL** (ينتهي بـ `/exec`).
6. في `index.html` ضع الرابط هنا:
   ```js
   WEBHOOK_URL: "https://script.google.com/macros/s/XXXX/exec",
   ```
7. افتح الصفحة واضغط أي زر. ستظهر أوراق `Leads` و`Events` و`Summary` تلقائياً.

> عند تعديل السكربت لاحقاً: **Deploy ← Manage deployments ← Edit ← New version**، حتى يبقى الرابط نفسه.

## 2. الإعدادات في أعلى `index.html`

```js
window.SADU_CONFIG = {
  WEBHOOK_URL: "",          // رابط Apps Script
  META_PIXEL_ID: "",        // من Meta Events Manager
  TIKTOK_PIXEL_ID: "",      // من TikTok Ads Manager ← Events
  WHATSAPP_NUMBER: "9665XXXXXXXX",
  SOCIAL: { tiktok: "...", snapchat: "...", instagram: "...", x: "..." }
};
```
البكسل لا يُحمَّل إلا إذا وضعت رقمه.

## 3. الأحداث المتتبعة

| الحدث | متى | Meta | TikTok |
|---|---|---|---|
| `page_view` | فتح الصفحة | PageView | page |
| `cta_click` | ضغط "صمّم غرفتك مجاناً" أو "ابدأ مجاناً" (مع المكان: hero / sticky / final / pricing) | TryFreeClick (مخصص) | ClickButton |
| `buy_click` | ضغط "اشترِ الآن" لباقة مدفوعة (مع الباقة والسعر) | InitiateCheckout | InitiateCheckout |
| `lead_submit` | إرسال رقم الجوال | Lead | SubmitForm |
| `whatsapp_click` | ضغط زر واتساب | — | — |

كل حدث يُحفظ مع رقم الجلسة وUTM. ورقة **Summary** تحسب: الزوار، ومن ضغط "اشترِ الآن"، و**نسبة الاستعداد للدفع** (الهدف 3% أو أكثر)، والضغطات لكل باقة.

> استخدم روابط UTM في كل إعلان، مثلاً: `?utm_source=tiktok&utm_campaign=najdi_video`، حتى تعرف أي إعلان يجيب مشترين.

## 4. استبدال الصور المؤقتة

ابحث عن `class="ph` واستبدل كل placeholder بصورة:
```html
<img class="shot" src="images/before-1.jpg" alt="مجلس قبل التصميم" loading="lazy">
```
احفظ الصور بصيغة WebP، بعرض 1200px وحجم أقل من 200KB.

## 5. النشر المجاني

### الخيار الأسرع: Netlify Drop (بدون حساب Git)
1. افتح https://app.netlify.com/drop وسجّل دخولك.
2. اسحب مجلد `sadu-landing` كاملاً وأفلته في الصفحة.
3. بعد ثوانٍ تحصل على رابط مثل `random-name.netlify.app`.
4. **Site configuration ← Change site name** لتغيير الاسم إلى `sadu`.
5. للتحديث لاحقاً: **Deploys** واسحب المجلد مرة أخرى.

### Vercel (عبر GitHub)
1. ارفع مجلد `sadu-landing` إلى مستودع على GitHub.
2. افتح https://vercel.com/new واختر المستودع.
3. Root Directory: `sadu-landing`. Framework Preset: **Other**. اترك أوامر البناء فارغة.
4. اضغط **Deploy**. كل تعديل تدفعه إلى GitHub ينشر تلقائياً.

### ربط دومين (اختياري)
- Netlify: **Domain management ← Add a domain**.
- Vercel: **Settings ← Domains**.
- أضف سجلات DNS التي تظهر لك عند مزود الدومين، وشهادة HTTPS تُفعَّل تلقائياً.

## 6. قبل إطلاق الإعلانات
- [ ] ضع رابط Webhook وجرّب إرسال رقم، وتأكد أنه ظهر في `Leads`.
- [ ] ضع رقمي البكسل وتحقق منهما عبر Meta Pixel Helper وTikTok Pixel Helper.
- [ ] ضع رقم واتساب وروابط السوشال الحقيقية.
- [ ] استبدل الصور المؤقتة.
- [ ] استبدل شارات الدفع بالشعارات الرسمية من بوابة الدفع.
- [ ] جرّب الصفحة على جوالك (iPhone وAndroid).
