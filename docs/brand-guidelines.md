# Brand Guidelines v1.0 — آفاق الفكر

> Last updated: 2026-11-26
> Status: Active
> Source of truth: the آفاق الفكر design system (claude.ai artifact). Tokens live in `assets/design-tokens.json` and `assets/design-tokens.css`. Both are generated from it, so do not run `sync-brand-to-tokens.cjs` on them.

## Quick Reference

| Element | Value |
|---------|-------|
| Primary Color | #111111 |
| Secondary Color | #F5F5F5 |
| Accent Color | #897A62 |
| Primary Font | Inter + IBM Plex Sans Arabic |
| Display Font | Bebas Neue + Noto Kufi Arabic |
| Direction | RTL, Arabic first |
| Voice | Direct, Confident, Editorial, Inviting |

**Core principle:** the image speaks, the interface stays quiet. Book covers and editorial photography carry all the colour. Everything else (nav, filters, buttons, cards, footer) is black, white and one grey. Dense but orderly.

Three fixed tools:
1. Book images on `soft-cloud` (#F5F5F5).
2. Black pill buttons (`radius-full`).
3. An 8px spacing grid.

---

## 1. Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Ink | #111111 | rgb(17,17,17) | The only brand colour: primary CTA, active chip, headings, body text |
| On Primary | #FFFFFF | rgb(255,255,255) | Text and icons on Ink fills |

### Secondary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Soft Cloud | #F5F5F5 | rgb(245,245,245) | Book-image backdrop, search pill, secondary CTA, utility bar |
| Charcoal | #39393B | rgb(57,57,59) | Softer body text. Never a button fill |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Bronze | #897A62 | rgb(137,122,98) | Editorial accent, book-cover moments only. Never chrome or CTA |
| Accent Teal | #0A7281 | rgb(10,114,129) | Collection lockups |
| Accent Pink | #ED1AA0 | rgb(237,26,160) | Small chip fills and swatch dots only |
| Accent Pink Soft | #FFB0DD | rgb(255,176,221) | Soft tile tint in member tiles |
| Accent Purple Soft | #BEAFFD | rgb(190,175,253) | Editorial swatch dot, soft category chip |
| Accent Purple Pale | #D6D1FF | rgb(214,209,255) | Lightest soft-tile fill |
| Accent Pink Deep | #4C012D | rgb(76,1,45) | Deep editorial wash over heritage tiles |

Accent colours are never used for text or for a primary button.

### Neutral Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Canvas | #FFFFFF | rgb(255,255,255) | Page background, product-card container |
| Ash | #4B4B4D | rgb(75,75,77) | Low-emphasis utility text on Canvas |
| Mute | #707072 | rgb(112,112,114) | Author, category, metadata, footer links. On Canvas or Soft Cloud only |
| Stone | #9E9EA0 | rgb(158,158,160) | Secondary text on Ink only. Fails on light grounds |
| Hairline | #CACACB | rgb(202,202,203) | 1px dividers. Decorative, never the only boundary of a control |
| Hairline Soft | #E5E5E5 | rgb(229,229,229) | Inset line under sticky bars |

Canvas and Soft Cloud cover about 95% of the interface.

### Semantic Colors

| State | Hex | Usage |
|-------|-----|-------|
| Sale | #D30005 | Discounted price and % off text. Price line only, never a background or badge |
| Sale Deep | #780700 | Pressed sale price, sale on dark |
| Success | #007D48 | Confirmations, in stock. Always with a word or icon |
| Success Bright | #1EAA52 | Success on Ink |
| Info | #1151FF | Informational link or badge in member callouts |
| Info Deep | #0034E3 | Pressed info |

### Accessibility

| Pair | Ratio | Result |
|------|-------|--------|
| Ink on Canvas | 18.9:1 | AAA |
| Ink on Soft Cloud | 17.3:1 | AAA |
| Mute on Canvas | 4.94:1 | AA |
| Mute on Soft Cloud | 4.53:1 | AA |
| Stone on Ink | 7.1:1 | AAA |
| Stone on Canvas | 2.67:1 | Fail: never use |
| Sale on Canvas | 5.57:1 | AA |
| Bronze on Ink | 4.52:1 | AA, prefer 24px+ |

Focus ring: 2px `outline` in Ink with a 2px offset on light grounds; Canvas on Ink.

---

## 2. Typography

The source fonts are proprietary, so we use free Google Fonts alternatives with an Arabic face for each family.

### Font Stack

```css
--font-heading: 'Inter', 'IBM Plex Sans Arabic', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-body: 'Inter', 'IBM Plex Sans Arabic', 'Helvetica Neue', Helvetica, Arial, sans-serif;
--font-display: 'Bebas Neue', 'Noto Kufi Arabic', 'Inter', Helvetica, Arial, sans-serif;
```

### Type Scale

| Style | Size | Weight | Line Height | Use |
|-------|------|--------|-------------|-----|
| display-campaign | 96px (tablet 64, mobile 48) | 500 | 0.9 | Latin campaign headline inside imagery, uppercase |
| display-campaign-ar | 96px (tablet 64, mobile 48) | 800 | 1.25 | Arabic campaign headline inside imagery |
| heading-xl | 32px | 500 | 1.2 | Section headers |
| heading-lg | 24px | 500 | 1.2 | Subsections, member-benefit title |
| heading-md | 16px | 500 | 1.75 | Card title, FAQ label |
| body-md | 16px | 400 | 1.5 | Default body |
| body-strong | 16px | 500 | 1.5 | Book name, primary nav |
| link-md | 16px | 500 | 1.75 | Underlined inline link |
| button-lg | 24px | 500 | 1.2 | Hero CTA |
| button-md | 16px | 500 | 1.5 | Standard pills and chips |
| button-sm | 14px | 500 | 1.5 | Compact pill |
| caption-md | 14px | 500 | 1.5 | Author, category (in Mute) |
| caption-sm | 12px | 500 | 1.5 | Badges, utility bar |
| utility-xs | 9px | 500 | 1.75 | Legal fine print only |

Rules:
- `letterSpacing` is always 0.
- Display styles are for campaign headlines inside images only, never a section title or book name.
- The jump from heading-xl (32px) to body-strong (16px) is deliberate: billboard above, catalogue below.
- Arabic display uses line height 1.25 so letters are not clipped.

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Sans+Arabic:wght@400;500;700&family=Inter:wght@400;500;700&family=Noto+Kufi+Arabic:wght@500;800&display=swap" rel="stylesheet">
```

---

## 3. Logo Usage

### Variants

| Variant | File | Use Case |
|---------|------|----------|
| Wordmark (text) | none yet | All contexts until a real logo is supplied |

There is no logo file yet. Set the name "آفاق الفكر" in `font-sans` weight 700, in Ink on light grounds or Canvas on Ink. Do not draw or generate a logo.

### Clear Space

Minimum clear space around the wordmark = the cap height of the wordmark.

### Minimum Size

| Context | Minimum |
|---------|---------|
| Digital wordmark | 16px font size |
| Print wordmark | 8pt |

### Don'ts

- Don't invent, draw or AI-generate a logo mark
- Don't set the wordmark in the display font
- Don't colour the wordmark outside Ink / Canvas
- Don't add shadows, outlines or effects

---

## 4. Voice & Tone

### Brand Personality

| Trait | Description |
|-------|-------------|
| **Direct** | Short sentences, no padding. Say it once |
| **Confident** | Editorial authority about books, without overselling |
| **Editorial** | Reads like a good bookshop's shelf card, not an ad |
| **Inviting** | Speaks to the reader as a peer and makes the next step obvious |

### Voice Chart

| Trait | We Are | We Are Not |
|-------|--------|------------|
| Direct | Clear, brief | Wordy, vague |
| Confident | Assured, knowledgeable | Pushy, hype-driven |
| Editorial | Curated, thoughtful | Generic retail |
| Inviting | Warm, welcoming | Overly casual, slangy |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Campaign headline | 2–4 words, bold | "اقرأ ما لا يُقال" |
| Section title | Short, descriptive | "الأكثر مبيعاً"، "جديد" |
| Buttons | Clear verb | "اشترِ الآن"، "أضف إلى السلة"، "استكشف" |
| Membership | Benefit first | "اقرأ أكثر، ادفع أقل" |
| Success | Brief | "تمت الإضافة إلى السلة" |
| Error | Calm, with the fix | "تعذّر الدفع. جرّب بطاقة أخرى." |

### Formatting Rules

- Prices: `39.99 ر.س`
- No emoji in the interface
- Uppercase only for Latin headlines in `display-campaign`
- Underline only inline links and the active nav indicator

### Prohibited Terms

| Avoid | Reason |
|-------|--------|
| الأفضل على الإطلاق | Unprovable claim |
| ثوري | Overused hype |
| لا مثيل له | Vague superlative |
| عرض لا يتكرر | False urgency |
| حصرياً جداً | Inflated |

### Forbidden Phrases

- "سارع قبل فوات الأوان"
- "أقوى عرض في التاريخ"
- "منتج رائع جداً جداً"

---

## 5. Imagery Guidelines

### Photography Style

- **Book shots:** cover on Soft Cloud (#F5F5F5), 4:5 ratio, filling the card edge to edge
- **Campaign tiles:** 16:9 on desktop, 4:5 on mobile; headline set inside the image; `on-image` pill at the bottom inline-start corner
- **Lighting:** soft, even studio light
- **Colour:** imagery carries all the colour; chrome stays monochrome
- The current book image in the asset library is a placeholder. Replace it with real covers before launch

### Illustrations

- Not part of the system. Use photography and book covers instead

### Icons

- Style: outlined line icons, 24×24
- Stroke: 1.5px
- Colour: `currentColor`
- Current set: search, heart, bag, arrow, chevron
- Temporary until a real icon set is supplied

---

## 6. Design Components

### Buttons

| Type | Background | Text | Border Radius |
|------|------------|------|---------------|
| Primary | #111111 | #FFFFFF | 9999px |
| Secondary | #F5F5F5 | #111111 | 9999px |
| On Image | #FFFFFF | #111111 | 9999px |
| Icon | — | #111111 | 9999px (40px circle) |

One `primary` per screen, plus at most one `secondary`. There is no third button shape.

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| space-xxs | 2px | Hairline gaps, icon nudges |
| space-xs | 4px | Mobile grid gutters |
| space-sm | 8px | Grid gutters; name → subtitle → price |
| space-md | 12px | Badge horizontal padding |
| space-lg | 18px | Between filter groups |
| space-xl | 24px | FAQ row padding, mobile section gap |
| space-xxl | 30px | Large inner gaps |
| space-section | 48px (tablet 32, mobile 24) | Between major sections |

### Border Radius

| Element | Radius |
|---------|--------|
| Cards, tiles, images, nav, footer | 0px |
| Member icon container | 18px |
| Search input | 24px |
| Buttons, chips, badges, swatches | 9999px |

### Depth

- No card shadows or lift
- `shadow-inset-hairline` under sticky bars
- `shadow-focus-halo` around the focused search pill

### Layout

```
ultrawide 1920+ | desktop 1440 | tablet 1023 | tablet-narrow 960 | mobile 599
```

- Max content width ~1440px
- Book grid: 3 columns desktop, 2 below 1023px, 1 below 599px
- Filter sidebar: 220px
- Use logical properties (`inline-start` / `inline-end`), never left/right

### Components

| Component | Use |
|-----------|-----|
| Button | primary / secondary / on-image pills, 40px icon button |
| FilterChip | category and format filters |
| SearchPill | nav search with focus halo |
| Badge | promo pill + sale text |
| ProductCard | book card with price and sale row |
| SwatchDot | edition or format options |
| CampaignTile | full-bleed editorial hero |
| CategoryIconCard | category strip |
| MemberBenefitCard | membership perks |
| DisclosureRow | product details + FAQ accordion |
| UtilityBar · PrimaryNav · FilterSidebar · Footer | page chrome |

All classes use the `afq-` prefix. Wrap pages in `.afq`.

### Do / Don't

| Do | Don't |
|----|-------|
| One primary button per screen | Shadows or lift on cards |
| Every book image on Soft Cloud | Underline anything but inline links and active nav |
| One campaign tile per row, then a 2- or 4-book grid | Sale or accent colours in base UI |

---

## AI Image Generation

### Base Prompt Template

```
Editorial bookshop photography, minimalist studio set on a seamless light grey background (#F5F5F5), soft even diffused lighting, crisp detail on the book cover, generous negative space, monochrome surroundings so the cover carries all the colour, no text overlays, no props clutter, premium and calm mood
```

### Style Keywords

| Category | Keywords |
|----------|----------|
| **Lighting** | soft diffused studio light, even, low contrast shadows |
| **Mood** | calm, curated, intelligent, premium |
| **Composition** | centered, generous negative space, 4:5 or 16:9 |
| **Treatment** | clean, true-to-life colour, monochrome surroundings |
| **Aesthetic** | editorial, minimalist, modern Arabic bookshop |

### Visual Mood Descriptors

- Quiet confidence: the book is the hero
- Editorial calm, like a curated shelf
- Monochrome stage, colourful cover

### Visual Don'ts

| Avoid | Reason |
|-------|--------|
| Busy, coloured backgrounds | The interface and backdrop must stay neutral |
| Stock smiling-people imagery | Off-brand, generic |
| Blue-purple gradients | Generic AI look |
| Fake or generated logos | No logo exists yet |
| Generated Arabic text in images | Usually malformed; add text in layout instead |

### Example Prompts

**Hero Banner:**
```
Wide 16:9 editorial shot of a single hardcover book standing upright on a seamless light grey (#F5F5F5) studio sweep, soft diffused light from the side, long gentle shadow, large empty space on one side for a headline, minimalist, premium bookshop campaign
```

**Social Media Post:**
```
4:5 overhead flat-lay of three books stacked at slight angles on a light grey (#F5F5F5) surface, soft even light, clean minimal composition, one black reading accessory as accent, calm editorial mood, no text
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-11-26 | Initial guidelines, generated from the آفاق الفكر design system |
