# PRD: صفحة اشتراك العضوية — متجر آفاق الفكر

| Field | Value |
| --- | --- |
| Feature | Membership landing page (MVP) |
| Platform | Salla |
| Design system | آفاق الفكر (`afq-` classes) |
| Status | Draft v1 |
| Date | 2026-11-26 |

---

## 1. نظرة عامة

متجر آفاق الفكر يبيع الكتب على منصة سلة، وما عنده اليوم أي طريقة تحوّل المشتري العابر إلى عميل متكرر أو تعطيه سبب يرجع.

الحل: برنامج عضوية بمستويين:

- **عضوية مجانية:** حساب في المتجر مع تنبيهات وعروض بالإيميل.
- **عضوية مدفوعة (`آفاق+`):** اشتراك شهري أو سنوي، يعطي خصم ثابت وشحن مجاني ووصول مبكر للإصدارات الجديدة.

هذا الـ `PRD` يغطي **المرحلة الأولى فقط (`MVP`)**: صفحة تسويقية تشرح المستويين والمزايا والأسعار، وأزرارها توجّه العميل لمسار التسجيل أو الدفع الموجود في سلة. ما فيه دفع داخل الصفحة ولا لوحة عضو في هذي المرحلة.

**الهدف:** نختبر الطلب على العضوية المدفوعة بأقل تكلفة تطوير، قبل ما نستثمر في دفع متكرر ولوحة إدارة.

---

## 2. الأهداف

| # | Goal | Target (first 90 days) |
| --- | --- | --- |
| G1 | Paid member sign-ups | 150 paid members |
| G2 | Free member sign-ups | 1,000 new accounts from the page |
| G3 | Page → checkout click-through (paid CTA) | ≥ 8% of page visitors |
| G4 | Yearly plan share of paid sign-ups | ≥ 35% |
| G5 | Repeat purchase rate, paid members vs non-members | 2× higher |

> الأرقام مقترحة كنقطة بداية. عدّلها حسب حجم زيارات المتجر الحالي.

---

## 3. قصص المستخدم

1. **كزائر جديد**، أبغى أفهم في أقل من 10 ثواني وش الفرق بين العضوية المجانية والمدفوعة، عشان أقرر بسرعة.
2. **كقارئ يشتري كتاب أو كتابين في الشهر**، أبغى أشوف كم بوفّر فعلياً مع `آفاق+`، عشان أعرف إذا الاشتراك يستاهل.
3. **كعميل حريص على السعر**، أبغى أقارن الخطة الشهرية بالسنوية وأشوف قيمة التوفير بالريال، عشان أختار الأنسب.
4. **كزائر متردد**، أبغى أسجّل مجاناً بضغطة وحدة بدون دفع، عشان أجرّب المتجر قبل ما ألتزم.
5. **كعميل عنده أسئلة**، أبغى أقرأ الأسئلة الشائعة (الإلغاء، التجديد، الشحن) في نفس الصفحة، عشان ما أحتاج أتواصل مع الدعم.
6. **كمستخدم جوال**، أبغى الصفحة تكون واضحة وسهلة على شاشة صغيرة، لأن أغلب الزيارات من الجوال.

---

## 4. المتطلبات الوظيفية

### 4.1 هيكل الصفحة (بالترتيب من فوق لتحت)

1. يجب أن تبدأ الصفحة بـ **بلاطة حملة** (`CampaignTile`) فيها:
   - عنوان قصير من 2 إلى 4 كلمات، مثال: "اقرأ أكثر، ادفع أقل".
   - سطر وصفي واحد.
   - زر `on-image` نصه "اشترك في آفاق+" ينقل المستخدم لقسم الخطط (4.1.3) داخل نفس الصفحة.
2. يجب أن يظهر تحت البلاطة **شريط مزايا** من 3 بطاقات `MemberBenefitCard`:
   - خصم ثابت على كل الكتب.
   - شحن مجاني.
   - وصول مبكر للإصدارات الجديدة.
   - كل بطاقة: أيقونة + عنوان (2–4 كلمات) + سطر شرح واحد.
3. يجب أن يحتوي قسم **الخطط** على 3 بطاقات جنب بعض على الديسكتوب، وتحت بعض على الجوال:

   | Card | Price | CTA | Destination |
   | --- | --- | --- | --- |
   | Free | 0 ر.س | "سجّل مجاناً" (`secondary`) | Salla sign-up / login |
   | آفاق+ Monthly | `[MONTHLY_PRICE]` ر.س / month | "اشترك شهرياً" (`secondary`) | Salla product page → cart |
   | آفاق+ Yearly | `[YEARLY_PRICE]` ر.س / year | "اشترك سنوياً" (`primary`) | Salla product page → cart |

4. يجب أن تُبرز بطاقة الخطة السنوية بشارة `Badge` نصها "وفّر X ر.س" أو "شهرين مجاناً". قيمة X تُحسب كالتالي:
   `(MONTHLY_PRICE × 12) − YEARLY_PRICE`
5. يجب أن تعرض كل بطاقة خطة قائمة مزاياها بعلامة ✓ أو ✗، بحيث يكون الفرق بين المجاني والمدفوع واضح:

   | Benefit | Free | آفاق+ |
   | --- | --- | --- |
   | Newsletter + sale alerts | ✓ | ✓ |
   | Fixed discount on all books (`[DISCOUNT]`%) | ✗ | ✓ |
   | Free shipping | ✗ | ✓ |
   | Early access to new releases | ✗ | ✓ |

6. يجب أن يحتوي القسم التالي على **حاسبة توفير بسيطة**:
   - المستخدم يختار عدد الكتب اللي يشتريها في الشهر (1، 2، 3، 4+).
   - الصفحة تعرض التوفير السنوي التقديري بالريال.
   - المعادلة: `books_per_month × 12 × AVG_BOOK_PRICE × DISCOUNT + 12 × AVG_SHIPPING_FEE − YEARLY_PRICE`.
   - الثوابت `AVG_BOOK_PRICE` و`AVG_SHIPPING_FEE` و`DISCOUNT` تكون في مكان واحد بالكود، يسهل تعديلها.
   - إذا كانت النتيجة سالبة أو صفر، تعرض الحاسبة "ابدأ بالعضوية المجانية" بدل رقم سالب.
7. يجب أن يحتوي القسم الأخير على **أسئلة شائعة** باستخدام `DisclosureRow`، وعلى الأقل الأسئلة التالية:
   - كيف أستخدم الخصم؟
   - هل يتجدد الاشتراك تلقائياً؟
   - كيف ألغي اشتراكي؟
   - هل الشحن المجاني يشمل كل المدن؟
   - متى يوصلني الوصول المبكر للإصدارات؟
   - الإجابات النهائية تعتمد على الأسئلة المفتوحة (القسم 9).
8. يجب أن يظهر **زر دعوة أخير** أسفل الصفحة ("اشترك في آفاق+") ينقل لقسم الخطط.

### 4.2 السلوك

9. يجب أن تعمل كل الأزرار بدون تسجيل دخول مسبق. سلة هي اللي تطلب تسجيل الدخول عند الحاجة.
10. يجب أن يكون التنقل داخل الصفحة (الزر ← قسم الخطط) بحركة `smooth scroll`.
11. يجب أن تحمل روابط الخطط المدفوعة معامل تتبع، مثال: `?ref=membership-page&plan=yearly`، عشان نقيس التحويل حسب الخطة.
12. يجب تسجيل الأحداث التالية في أداة التحليلات:

    | Event | Trigger |
    | --- | --- |
    | `membership_page_view` | Page load |
    | `membership_cta_click` | Any plan CTA (with `plan` = free / monthly / yearly) |
    | `membership_calculator_use` | User changes books-per-month value |
    | `membership_faq_open` | FAQ row opened (with question id) |

13. يجب أن تكون الصفحة متاحة على رابط ثابت وسهل، مثال: `/membership` أو `/afaq-plus`.

### 4.3 المحتوى

14. يجب أن تكون كل النصوص بالعربي، والصفحة `rtl`.
15. يجب كتابة الأسعار بالصيغة `29 ر.س` و`290 ر.س`.
16. يجب ألا تحتوي الواجهة على إيموجي.

---

## 5. خارج النطاق (`Non-Goals`)

هذي الأشياء **ما تنبني** في المرحلة الأولى:

- الدفع داخل الصفحة. الدفع يتم عبر مسار سلة الحالي فقط.
- لوحة العضو: الإلغاء، الترقية، التجديد، سجل الفواتير.
- التجديد التلقائي المبني بكود خاص. إذا سلة ما تدعمه مباشرة، الاشتراك يكون مدفوع مسبقاً لمدة ثابتة (شهر أو سنة).
- نظام نقاط أو مستويات ولاء (ذهبي، فضي).
- مستوى ثالث للعضوية.
- كتب إلكترونية أو صوتية ضمن الاشتراك.
- تخصيص الصفحة حسب العميل (مثل: "مرحباً محمد، أنت عضو").
- نسخة إنجليزية من الصفحة.

---

## 6. اعتبارات التصميم

استخدم نظام تصميم **آفاق الفكر** كما هو. أهم القواعد للصفحة هذي:

| Rule | Applies to |
| --- | --- |
| `ink` (#111111) is the only brand color | Primary button, headings, text |
| Only one `primary` button per screen | Yearly plan CTA |
| `canvas` / `soft-cloud` backgrounds | ~95% of the page |
| No card shadows, `radius-none` containers | Plan cards, benefit cards |
| All buttons are pills (`radius-full`) | Every CTA |
| `sale` / `accent-*` colors not in base UI | Do not use for plan cards |
| 8px spacing grid, `space-section` between sections | Whole page |
| Wrap page in `.afq` | Root element |

**المكونات المطلوبة:**

| Component | Section |
| --- | --- |
| `CampaignTile` | Hero |
| `MemberBenefitCard` | Benefits strip |
| `Button` (`primary`, `secondary`, `on-image`) | All CTAs |
| `Badge` | "Save X SAR" on yearly plan |
| `FilterChip` | Books-per-month selector in calculator |
| `DisclosureRow` | FAQ |

**ملاحظات:**

- بطاقات الخطط ما لها مكوّن جاهز في النظام. ابنها من نفس القواعد: بدون ظل، `radius-none`، حد `hairline` بعرض 1px. الخطة السنوية تتميز بحد `ink` بدل `hairline`، مو بلون خلفية.
- النظام ما فيه شعار ولا مجموعة أيقونات حالياً. استخدم اسم "آفاق الفكر" نصاً، وأيقونات خطية 24×24 مؤقتة.
- على الجوال (أقل من 599px): بطاقات الخطط تحت بعض، والسنوية أول وحدة.

---

## 7. اعتبارات تقنية

- **المنصة سلة:** الصفحة تُبنى داخل ثيم المتجر (`Twilight` theme) كصفحة مخصصة، أو كصفحة تعريفية إذا كانت تسمح بالكود المطلوب. تأكد من الخيار المتاح في باقة المتجر قبل البدء.
- **منتج العضوية:** الخطتين المدفوعتين تُنشأ كمنتج في سلة (منتج رقمي/خدمة بدون شحن) بخيارين: شهري وسنوي. أزرار الصفحة تربط لهذا المنتج أو تضيفه للسلة مباشرة.
- **تطبيق المزايا:** الخصم والشحن المجاني للأعضاء يحتاج آلية في سلة، مثل **مجموعات العملاء** مع خصم أو قواعد شحن خاصة بالمجموعة، أو تطبيق اشتراكات من متجر تطبيقات سلة. إضافة العميل للمجموعة بعد الشراء قد تكون يدوية في `MVP`. **هذا يحتاج تأكيد قبل الإطلاق** (انظر القسم 9).
- **الحاسبة والتتبع:** `JavaScript` بسيط بدون مكتبات خارجية. كل الثوابت (الأسعار، نسبة الخصم، متوسط سعر الكتاب، متوسط الشحن) في كائن واحد أعلى الملف.
- **التحليلات:** استخدم أداة التحليلات المربوطة بالمتجر (مثل `Google Analytics 4` أو `Meta Pixel`) لتسجيل الأحداث في 4.2.
- **الأداء:** الصورة الرئيسية بصيغة `webp`، وحجمها أقل من 200KB. الخطوط من `bundle.css` الخاص بنظام التصميم.
- **إمكانية الوصول:** تباين النص 4.5:1 على الأقل، حلقة تركيز ظاهرة على كل زر، والأسئلة الشائعة تعمل بلوحة المفاتيح.

---

## 8. مقاييس النجاح

| Metric | How to measure | Target |
| --- | --- | --- |
| Paid conversion rate | Paid sign-ups ÷ page visitors | ≥ 2% |
| CTA click-through | `membership_cta_click` ÷ `membership_page_view` | ≥ 8% |
| Yearly plan share | Yearly ÷ all paid sign-ups | ≥ 35% |
| Free sign-ups | Accounts created with `ref=membership-page` | 1,000 in 90 days |
| Member repeat purchases | Orders per member vs non-member, 90 days | 2× |
| Month-1 retention (monthly plan) | Members who renew after first month | ≥ 60% |

**قرار ما بعد `MVP`:** إذا تحققت أهداف G1 وG3، ننتقل للمرحلة الثانية (دفع متكرر ولوحة عضو).

---

## 9. أسئلة مفتوحة

| # | Question | Owner | Blocks |
| --- | --- | --- | --- |
| Q1 | Final prices: monthly and yearly? (suggested: 29 ر.س / 290 ر.س) | Business | Plan cards, calculator |
| Q2 | Discount percentage for paid members? (suggested: 10%) | Business | Benefits, calculator |
| Q3 | Does free shipping cover all cities, or a minimum order value? | Operations | Benefits copy, FAQ |
| Q4 | How is "early access" delivered? (email 48h before launch? members-only pre-order?) | Marketing | Benefit copy, FAQ |
| Q5 | Does the Salla plan support recurring billing, or is it prepaid fixed-term? | Tech | FAQ (renewal/cancel) |
| Q6 | How are members added to the discount group: app, automation, or manual? | Tech / Ops | Launch readiness |
| Q7 | What do free members get beyond newsletter and sale alerts? | Marketing | Free plan card |
| Q8 | Real average book price and shipping fee for the calculator? | Business | Calculator |
| Q9 | Refund / cancellation policy for paid members? | Legal / Ops | FAQ |
