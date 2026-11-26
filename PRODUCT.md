# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Salla storefront, Twilight theme. New surfaces are built as Twilight theme components (Twig templates + CSS + vanilla JS), not as a separate app. (User decision, 2026-11-26.)

## Users

Primary: Arabic-speaking readers in Saudi Arabia interested in self-development, psychology and business books. They shop on mobile, usually order one or two books at a time, and decide by title, cover and price. (Confirmed by user.)

## Product Purpose

آفاق الفكر is an online bookstore on Salla selling Arabic books in self-development, psychology, business and thought. The current initiative adds a membership program (`آفاق+`) to turn one-off buyers into repeat customers: a free tier (account + email alerts) and a paid tier (fixed discount, free shipping, early access to new releases), sold monthly or yearly. Requirements: `tasks/prd-membership-page.md`.

Success for the membership MVP: paid sign-ups, page-to-checkout click-through, yearly-plan share, and repeat purchase rate of members versus non-members (targets in the PRD).

## Positioning

آفاق الفكر has its own editions and titles not sold elsewhere (confirmed by user). That makes "early access to new releases" a benefit only this store can offer: members get the store's own releases first.

Exact list of exclusive titles: undecided, not yet supplied.

## Operating Context

- Customers browse the Salla storefront, mostly on phones, and check out through Salla's cart and payment flow.
- Membership is sold as a hidden Salla product with monthly and yearly options; the membership page links to it.
- Member benefits depend on Salla mechanics (customer groups, shipping rules, or a subscriptions app). Recurring billing and automatic member assignment are unconfirmed (PRD Q5, Q6).

## Capabilities and Constraints

- RTL, Arabic first. Prices written `39.99 ر.س`.
- Undecided (do not state as fact): final prices (proposed 29 ر.س monthly, 290 ر.س yearly), discount (proposed 10%), free-shipping coverage and minimum order, early-access lead time, renewal model, cancellation/refund policy, average book price and shipping fee.
- Information architecture: `docs/site-architecture.md`. Page copy: `docs/copy-membership.md`.

## Brand Commitments

- Name: آفاق الفكر. Paid tier: آفاق+.
- Design system: the آفاق الفكر design system (claude.ai artifact), mirrored in `docs/brand-guidelines.md` and `assets/design-tokens.{json,css}`. Binding.
- No logo exists. The wordmark is the name set in text. Do not draw or generate one.
- Voice: direct, confident, editorial, inviting. Short sentences, no emoji, no exclamation marks, no hype.

## Evidence on Hand

- One placeholder book cover image in the design system's asset library; real covers must replace it before launch.
- No testimonials, member counts, reviews, press or sales figures. Do not fabricate any.
- No icon set; temporary 24×24 line icons.

## Product Principles

1. Books are the hero; the store's interface stays out of the way.
2. Every claim on a page must be true on Salla today; unconfirmed mechanics are flagged, never promised.
3. Respect the light reader: recommend the free tier when the paid tier does not pay off for them.
4. One clear next step per screen.
5. The store's own editions are the reason to belong.

## Accessibility & Inclusion

WCAG 2.1 AA: text contrast 4.5:1, visible focus rings, keyboard-operable controls, `prefers-reduced-motion` respected. Arabic text must never clip (display line height 1.25).
