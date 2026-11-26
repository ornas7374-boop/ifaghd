# Copy — Membership page (`/membership`)

> Skill: copywriting. Sources: `tasks/prd-membership-page.md`, `docs/brand-guidelines.md`, `docs/site-architecture.md`.
> Status: Draft v1, 2026-11-26.

**Diagnosis: A (blank brief).** The PRD supplies facts (two tiers, three paid benefits, monthly + yearly) but no copy, voice sample or proof. Angle is mine; facts are not. Every number below is the PRD's proposed value and must be confirmed. Anything the sources cannot support is flagged `[NEED: …]`.

**Writer:** an Arabic bookseller who knows that most readers order one or two books at a time, and that a shipping fee on a single 40-riyal book is what makes them close the tab. Plain Modern Standard Arabic, short sentences, no hype.

**Working numbers (PRD proposals, unconfirmed):**

```
MONTHLY_PRICE = 29 SAR
YEARLY_PRICE  = 290 SAR   -> saves 58 SAR vs 12 x 29 = two months free
DISCOUNT      = 10%
```

---

## Page Copy

### 1. Hero (`CampaignTile`)

| Unit | Copy |
|------|------|
| Headline (`display-campaign-ar`) | اطلب كتاباً واحداً، والشحن علينا |
| Subhead | اشتراك آفاق+ يعطيك خصم 10% على كل كتاب وشحناً مجانياً، ويصلك كل إصدار جديد قبل نزوله للجميع. يبدأ من 29 ر.س شهرياً. |
| CTA (`on-image`) | اختر خطتك |

`[NEED: Q3]` The headline promises free shipping on a one-book order. It holds only if member shipping has no minimum order value. If a minimum exists, use Alternative B.

### 2. Benefits (3 × `MemberBenefitCard`)

| # | Title (`heading-lg`) | Line (`body-md`) |
|---|----------------------|------------------|
| 1 | خصم 10% على كل كتاب | يظهر الخصم في السلة على كل طلب بعد تفعيل عضويتك. `[NEED: does it stack with books already on sale?]` |
| 2 | شحن مجاني | على كل طلب، حتى لو كان كتاباً واحداً. `[NEED: Q3 cities covered, minimum order]` |
| 3 | الإصدارات الجديدة أولاً | يصلك إشعار بكل إصدار جديد قبل نزوله في المتجر بـ `[NEED: Q4 lead time, e.g. 48 ساعة]`، وتطلبه قبل غيرك. |

Benefit 3 links to `/new` with the text: شاهد آخر الإصدارات

### 3. Plans

Section heading (`heading-xl`): اختر خطتك

| | Free | آفاق+ شهري | آفاق+ سنوي |
|---|---|---|---|
| Name | مجاني | شهري | سنوي |
| Price | 0 ر.س | 29 ر.س / شهرياً | 290 ر.س / سنوياً |
| Badge | — | — | وفّر 58 ر.س |
| Price note (`caption-md`, `mute`) | — | تدفع شهراً بشهر | أي 24.17 ر.س في الشهر |
| One-liner | حساب في آفاق الفكر، ونرسل لك العروض والإصدارات الجديدة بالبريد. | كل مزايا آفاق+ بدفعة شهرية. | كل مزايا آفاق+، وشهران مجاناً. |
| CTA | أنشئ حسابك المجاني (`secondary`) | اشترك شهرياً (`secondary`) | اشترك سنوياً (`primary`) |

Feature rows (✓ / ✗):

| Row | Free | آفاق+ |
|-----|------|-------|
| تنبيهات العروض والإصدارات بالبريد | ✓ | ✓ |
| خصم 10% على كل كتاب | ✗ | ✓ |
| شحن مجاني على كل طلب | ✗ | ✓ |
| الإصدارات الجديدة قبل نزولها | ✗ | ✓ |

Line under the cards (`caption-md`): `[NEED: Q5]` pick one:
- Recurring billing: يتجدد اشتراكك تلقائياً، وتقدر تلغيه في أي وقت من حسابك.
- Prepaid: تدفع مرة واحدة للمدة كاملة، ولا يتجدد إلا إذا جددته بنفسك.

### 4. Savings calculator

| Unit | Copy |
|------|------|
| Heading (`heading-lg`) | كم كتاباً تشتري في الشهر؟ |
| Chips (`FilterChip`) | كتاب واحد · كتابان · 3 كتب · 4 أو أكثر |
| Result (positive) | مع الخطة السنوية توفّر تقريباً **{X} ر.س** في السنة. |
| Result (zero or negative) | مع هذا العدد، العضوية المجانية تكفيك الآن. ترقّ إلى آفاق+ متى زادت طلباتك. |
| Footnote (`caption-sm`, `mute`) | تقدير مبني على متوسط سعر الكتاب ({AVG_BOOK_PRICE} ر.س) ومتوسط رسوم الشحن ({AVG_SHIPPING_FEE} ر.س). |

`[NEED: Q8 real AVG_BOOK_PRICE and AVG_SHIPPING_FEE]`

### 5. FAQ (`DisclosureRow`)

Section heading (`heading-xl`): الأسئلة الشائعة

| Question | Answer |
|----------|--------|
| كيف أستخدم الخصم؟ | بعد تفعيل عضويتك يظهر خصم 10% في السلة على كل كتاب. `[NEED: activation time after payment, Q6]` |
| هل يتجدد الاشتراك تلقائياً؟ | `[NEED: Q5]` use the matching line from section 3. |
| كيف ألغي اشتراكي؟ | `[NEED: Q9 cancellation and refund policy]` التفاصيل في [سياسة الاسترجاع والإلغاء](/help/returns). |
| هل الشحن المجاني يشمل كل المدن؟ | `[NEED: Q3]` |
| متى تصلني الإصدارات الجديدة؟ | `[NEED: Q4]` |
| هل أقدر أبدأ مجاناً وأشترك لاحقاً؟ | نعم. أنشئ حسابك المجاني الآن، واشترك في آفاق+ من هذه الصفحة متى أردت. |

Link under the list: باقي الأسئلة في [صفحة المساعدة](/help/faq)

### 6. Final CTA

| Unit | Copy |
|------|------|
| Heading (`heading-xl`) | ابدأ من طلبك القادم |
| Body | اشترك اليوم، ويطبّق الخصم والشحن المجاني على أول طلب بعد التفعيل. |
| CTA (`primary`, scrolls to plans) | اشترك في آفاق+ |

---

## Annotations

| Element | Choice | Principle |
|---------|--------|-----------|
| Headline | Leads with the one-book order and shipping, the most concrete pain | Picturable, falsifiable, fails the swap test for any store that charges shipping on small orders |
| Subhead | All three benefits plus the entry price in two sentences | Specific over vague; the price removes the "how much?" question before the scroll |
| CTA "اختر خطتك" | Sends to the plans instead of straight to checkout | Visitor still has to pick monthly or yearly; a direct "buy" would skip that choice |
| Yearly badge "وفّر 58 ر.س" | Riyal amount instead of a percentage | A sum the reader can picture beats "save 17%" |
| Monthly equivalent "24.17 ر.س" | Under the yearly price | Makes the yearly plan compare like-for-like with 29 ر.س |
| Calculator negative state | Recommends the free tier | Honest over sensational; a store that tells a light reader to stay free earns trust for the paid pitch |
| No testimonials or member counts | Left out | No proof exists yet. Unlock: real member reviews or counts after the first 90 days |
| One `primary` per screen | Yearly CTA in plans, final CTA in its own screen | Brand rule |

### Declined claims

| Claim | Why declined | Unlock |
|-------|--------------|--------|
| "انضم إلى آلاف القرّاء" | No member base yet | Member count from Salla after launch |
| "أرخص من أي متجر آخر" | No price comparison data | A dated price comparison against named competitors |
| "توفّر مئات الريالات سنوياً" | Depends on order volume; true only for heavy readers | The calculator shows the real figure per reader |

---

## Alternatives

**Headline**
- A (chosen): اطلب كتاباً واحداً، والشحن علينا. Rationale: names the exact moment shipping stings.
- B: كل كتاب بخصم 10%، وشحنه علينا. Rationale: safe if member shipping has a minimum order; leads with the discount instead.
- C: اقرأ أكثر، ادفع أقل. Rationale: short and on-brand, but a competitor could run it unchanged. Use only as a campaign tagline.

**Hero CTA**
- A (chosen): اختر خطتك. Rationale: matches what happens next.
- B: اشترك في آفاق+. Rationale: stronger commitment, but skips the plan choice.
- C: شاهد الخطط والأسعار. Rationale: lowest friction for cold traffic from ads.

**Final CTA heading**
- A (chosen): ابدأ من طلبك القادم. Rationale: ties the decision to a purchase the reader already plans.
- B: خصمك جاهز مع طلبك القادم. Rationale: more concrete, slightly more salesy.

---

## Meta

| Field | Copy |
|-------|------|
| Page title | آفاق+ \| خصم 10% وشحن مجاني على الكتب من آفاق الفكر |
| Meta description | اشترك في آفاق+ من 29 ر.س شهرياً واحصل على خصم 10% على كل كتاب وشحن مجاني على كل طلب، مع الإصدارات الجديدة قبل نزولها. أو ابدأ بحساب مجاني. |

---

## Self-check log

| Check | Result |
|-------|--------|
| Contrast reveals ("ليس… بل", "لا… فقط") | None |
| Negation lists | None; the one real absence ("لا يتجدد إلا إذا…") stays in the prepaid option only |
| Self-answered questions / colon reveals | None in short copy; questions appear only as the reader's own (calculator, FAQ) |
| Em dashes | None |
| Exclamation marks, emoji | None |
| Sentences over 20 words | Subhead sentence 1 (16 words) OK |
| Swap test | Headline and subhead pass; plan heading "اختر خطتك" is generic by design (wayfinding, not persuasion) |
| Unsupported claims | All flagged `[NEED: …]` against PRD open questions |
