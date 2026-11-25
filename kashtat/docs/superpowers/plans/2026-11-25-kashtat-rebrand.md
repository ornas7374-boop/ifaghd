# Kashtat Rebrand (Purple + Gold) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the green/sand identity with the supplied purple + sand-gold design system across tokens, shared UI components and the home page, with light as the default theme.

**Architecture:** Keep the existing CSS custom-property names in `src/app/globals.css` and give them the design system's values, adding only the names the old system lacks (`band`, `band-alt`, `on-band`, `on-band-muted`, `accent`, `on-accent`, `brand-strong`, `line`, motion tokens). Tailwind 4 reads them through `@theme inline`, so every page picks up the new identity without renaming classes. The home hero and two mid-page sections are rebuilt as angled bands, and a new `AngledSection` component carries that pattern.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, `next/font/google`, Vitest 5, pnpm.

**Spec:** `kashtat/design-system/README.md` and `kashtat/design-system/tokens.css` (visual source of truth), `kashtat/PRODUCT.md` (product truth). The decisions settled in the grilling round on 2026-11-25 are listed under Global Constraints.

## Global Constraints

- Default theme is **light**. A stored `kashtat-theme` value of `"dark"` or `"light"` still wins.
- Token values come verbatim from `design-system/tokens.css` (light = `:root`, dark = `[data-theme="dark"]`). Never hard-code hex inside components.
- Existing token names stay. Mapping: `bg`→`surface` value (`#faf7fd` / `#17102a`), `surface`→`surface` value, `surface-raised`→`surface-raised`, `surface-overlay`→`surface-sunken`, `border`→`line`, `brand-subtle`→`brand-soft`, `sand`→`accent`, `sand-subtle`→`accent`. `on-sand` is new and equals `on-accent`.
- Fonts: headings use `Readex Pro` (400/600/700), body uses `IBM Plex Sans Arabic` (400/500/600/700), and `IBM Plex Mono` 500 is kept only for booking IDs. No letter-spacing or uppercase on Arabic text.
- Shape: buttons, inputs and badges use `rounded-pill`, cards use `radius-md` (16px), large panels use `radius-lg` (24px). Cards have `shadow-card` and no border. They lift to `shadow-lift` on hover.
- Gold (`accent`) is used only for price emphasis, the `pending` status, and moon/star shapes.
- Booking status labels stay as they are in `src/lib/booking-status.ts`. No «عربون» or «طلب حجز» copy anywhere.
- Motion: only `transform` and `opacity` are animated. Buttons lift 2px and cards lift 6px. Section reveal uses `k-rise` with an 80ms stagger via `--i`. Only decorative shapes loop (`k-drift`, 6s). Everything stops under `prefers-reduced-motion`.
- The old 3D effects (`.tilt`, `.deck`, `.layer`, `.num3d`) are removed everywhere.
- Existing hero copy is kept word for word. No logo is drawn: «كشتات» is written as text.
- No gradients.

## Review Focus

1. **Focus ring on bands:** `--focus` in light (`#3b1f78`) equals `--band`, so a focused link or button on a band is invisible. Inside `.band` the expected behavior is a ring in `on-band`. The test lives in Task 6 (screenshot check of the focused hero button).
2. **Returning dark-mode users:** a visitor with `kashtat-theme=dark` in storage must still get dark after the default flips. The test lives in Task 1 (`resolveTheme("dark") === "dark"`).
3. **Corrupt storage:** a stored value like `"blue"` or an exception from `localStorage` must fall back to light, not dark. The test lives in Task 1.
4. **Slant clipping on phones:** at 390px wide the `clip-path` bottom edge must not cut off the last line of text or the search button. The expected behavior is padding that grows by `--slant`. The check lives in Task 6 (mobile screenshot).
5. **Featured places with no database:** with Supabase unreachable, the home page must render its "could not load" message inside the new card styling and must not crash. The check lives in Task 8 (build and run without real env).

---

### Task 1: Light-first theme resolution

**Files:**
- Modify: `src/lib/theme.ts`
- Modify: `src/app/layout.tsx` (the `data-theme` attribute and `viewport.themeColor`)
- Modify: `src/components/ui/theme-toggle.tsx` (fallbacks)
- Test: `src/lib/__tests__/theme.test.ts`

**Interfaces:**
- Produces: `resolveTheme(stored: string | null): Theme` and `DEFAULT_THEME: Theme = "light"`. `themeInitScript` keeps its name.

- [ ] **Step 1: Write the failing test** `src/lib/__tests__/theme.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, resolveTheme, themeInitScript } from "@/lib/theme";

describe("resolveTheme", () => {
  it("defaults to light", () => expect(DEFAULT_THEME).toBe("light"));
  it("keeps a stored dark choice", () => expect(resolveTheme("dark")).toBe("dark"));
  it("keeps a stored light choice", () => expect(resolveTheme("light")).toBe("light"));
  it("falls back to light for missing or invalid values", () => {
    expect(resolveTheme(null)).toBe("light");
    expect(resolveTheme("blue")).toBe("light");
  });
  it("init script falls back to light", () => {
    expect(themeInitScript).toContain('t="light"');
    expect(themeInitScript).not.toContain('t="dark"}');
  });
});
```

- [ ] **Step 2: Run it and confirm it fails.** Run: `pnpm test src/lib/__tests__/theme.test.ts`. Expected: FAIL (`resolveTheme` is not exported).
- [ ] **Step 3: Implement.** In `theme.ts`, export `DEFAULT_THEME` and `resolveTheme`. Change both fallbacks in `themeInitScript` (the invalid-value branch and the `catch`) to `"light"`. In `layout.tsx`, set `data-theme="light"` and set `themeColor` to `#faf7fd` (light) and `#17102a` (dark). In `theme-toggle.tsx`, make `readTheme` return `"dark"` only when the attribute is `"dark"`, and make the server snapshot `"light"`.
- [ ] **Step 4: Run it and confirm it passes.** Run: `pnpm test`. Expected: all suites PASS.
- [ ] **Step 5: Commit.** `git commit -m "feat(theme): make light the default theme"`

### Task 2: Design tokens

**Files:**
- Modify: `src/app/globals.css` (the two theme blocks, `@theme inline`, and `@layer base`)

**Interfaces:**
- Produces these Tailwind classes, used by Tasks 4–7: `bg-band`, `bg-band-alt`, `text-on-band`, `text-on-band-muted`, `bg-accent`, `text-accent`, `text-on-accent`, `text-brand-strong`, `bg-line`, `shadow-card`, `shadow-lift`, `rounded-md` (16px), `rounded-lg` (24px), `font-display`. Also CSS variables `--duration-fast|base|slow|hero` and `--easing-out|spring|inout`.

- [ ] **Step 1: Rewrite the theme blocks.** Use `:root, [data-theme="light"]` for light and `[data-theme="dark"]` for dark, with values from `design-system/tokens.css` under the mapping in Global Constraints. Keep `warning`, `info` and their `-subtle` pairs: set `warning`=`accent`, `warning-subtle`=`brand-soft`, `info`=`brand`, `info-subtle`=`brand-soft`. Set `success-subtle` and `danger-subtle` to `surface-raised`, because badges become outlined. Set `--backdrop` to the design system's `--overlay`. Keep `color-scheme` on each block.
- [ ] **Step 2: Extend `@theme inline`.** Add the new colour names, `--font-display: var(--font-readex), var(--font-plex-arabic), system-ui, sans-serif`, radii `sm 8px / md 16px / lg 24px`, `--shadow-card`, `--shadow-lift`, and the duration and easing tokens. Update the type scale to the design system's sizes: `display-xl 56/68`, `display-lg 40/52`, `display-md 28/40`, `body-lg 18/32`, `body 16/28`, `body-sm 14/24`, `label 13/20`.
- [ ] **Step 3: Base layer.** Set `h1, h2, h3 { font-family: var(--font-display) }` and `body { line-height: 28px; background: var(--bg) }`. Add a `.band :focus-visible { outline-color: var(--on-band) }` override (Review Focus 1).
- [ ] **Step 4: Verify.** Run: `pnpm lint && pnpm typecheck`. Expected: no errors. `grep -n "#" src/components -r | grep -i "fill=\"#\|color: #"` returns nothing new.
- [ ] **Step 5: Commit.** `git commit -m "feat(tokens): apply purple and gold design tokens"`

### Task 3: Fonts

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `--font-display` from Task 2, which reads `--font-readex`.
- Produces: the CSS variable `--font-readex` on `<html>`.

- [ ] **Step 1: Load the font.** Import `Readex_Pro` from `next/font/google` with `variable: "--font-readex"`, `subsets: ["arabic", "latin"]`, `weight: ["400", "600", "700"]`, `display: "swap"`, and add its `.variable` to the `<html>` className.
- [ ] **Step 2: Verify.** Run: `pnpm typecheck`. Expected: PASS.
- [ ] **Step 3: Commit.** `git commit -m "feat(type): add Readex Pro for headings"`

### Task 4: Motion utilities and removal of the old 3D effects

**Files:**
- Modify: `src/app/globals.css` (delete `.tilt`, `.deck`, `.layer`, `.num3d` and their media queries, then add the motion block)
- Modify: every file that uses those classes, found with `grep -rln "tilt\|deck\|num3d\|\blayer\b" src`. At the time of writing these are `src/components/places/place-card.tsx`, `src/components/home/sections.tsx`, `src/app/admin/page.tsx`, `src/app/places/[slug]/page.tsx`, `src/app/styleguide/page.tsx` and `src/app/not-found.tsx`.

**Interfaces:**
- Produces these classes: `k-rise` (reads `--i`), `k-drift` (reads `--i`), `k-pop`, and `lift`. `lift` gives a card its hover state: `translateY(-6px)` plus `shadow-lift`, over `--duration-slow` with `--easing-out`.

- [ ] **Step 1: Add the keyframes and classes.** Copy `k-rise`, `k-drift` and `k-pop` from `design-system/components/bundle.css`, and add `.lift`. Under `prefers-reduced-motion: reduce`, set `animation: none` and `transform: none` for all four.
- [ ] **Step 2: Replace the old classes.** Change `tilt` to `lift`. Remove `deck` and `layer` with no replacement. Replace `num3d font-mono` with `font-display`.
- [ ] **Step 3: Verify.** Run: `grep -rn "tilt\|num3d\|\bdeck\b" src`. Expected: no output. Run: `pnpm lint && pnpm typecheck`. Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "refactor(motion): replace 3D effects with design-system motion"`

### Task 5: Shared UI components

**Files:**
- Modify: `src/components/ui/button.tsx`, `src/components/ui/control-classes.ts`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/theme-toggle.tsx`, `src/components/places/place-card.tsx`
- Modify: `src/lib/booking-status.ts` (the `StatusTone` union and `pending`)
- Test: `src/lib/__tests__/booking-status.test.ts`

**Interfaces:**
- Produces: `Variant = "primary" | "secondary" | "ghost" | "danger" | "accent" | "onBand"` in `button.tsx`, and `StatusTone` gains `"accent"`, which replaces `"sand"`.

- [ ] **Step 1: Write the failing test** `src/lib/__tests__/booking-status.test.ts`

```ts
import { expect, it } from "vitest";
import { BOOKING_STATUS_META } from "@/lib/booking-status";

it("pending is gold and keeps its wording", () => {
  expect(BOOKING_STATUS_META.pending).toEqual({ label: "بانتظار التأكيد", tone: "accent" });
});
it("no status uses the retired sand tone", () => {
  expect(Object.values(BOOKING_STATUS_META).map((m) => m.tone)).not.toContain("sand");
});
it("labels never mention a deposit", () => {
  for (const m of Object.values(BOOKING_STATUS_META)) expect(m.label).not.toMatch(/عربون/);
});
```

- [ ] **Step 2: Run it and confirm it fails.** Run: `pnpm test src/lib/__tests__/booking-status.test.ts`. Expected: FAIL on `tone`.
- [ ] **Step 3: Implement.**
  - `booking-status.ts`: `pending.tone = "accent"`, `checked_in.tone = "info"`, and replace `sand` with `accent` in the union.
  - `button.tsx`: base gets `rounded-pill` plus transitions on `transform, box-shadow, background-color`. Hover gets `-translate-y-0.5 shadow-lift`, active gets `scale-[.98]`, and all three are disabled under `motion-reduce`. Add an `accent` variant (`bg-accent text-on-accent`) and an `onBand` variant (`bg-on-band text-band`). Sizes become `sm h-9`, `md h-12`, `lg h-[52px]`.
  - `control-classes.ts`: `h-[52px] rounded-pill bg-surface-raised px-6 border-[1.5px]`.
  - `card.tsx`: remove `border border-border`, use `rounded-md shadow-card` and `p-6`.
  - `badge.tsx`: outlined pill (`border-[1.5px] border-current bg-transparent`, `text-label`). The `accent` tone is a solid `bg-accent text-on-accent border-transparent`. Make the existing dot a 14px check/x/clock icon so status never depends on colour.
  - `theme-toggle.tsx`: `rounded-pill`.
  - `place-card.tsx`: `lift rounded-md shadow-card` with no border, media `aspect-[16/10]` (replacing `h-[180px]`), image scales 5% on hover over `--duration-hero`, title `font-display text-[20px] leading-8 font-semibold`, price `font-display text-[22px] font-bold`, and the «مميز» chip becomes `bg-accent text-on-accent`.
- [ ] **Step 4: Run it and confirm it passes.** Run: `pnpm test && pnpm typecheck`. Expected: PASS. Then check every `tone="sand"` call site: `grep -rn "sand" src` should show nothing outside comments.
- [ ] **Step 5: Commit.** `git commit -m "feat(ui): restyle buttons, fields, cards and badges"`

### Task 6: AngledSection and the new hero

**Files:**
- Create: `src/components/ui/angled-section.tsx`
- Modify: `src/components/home/hero.tsx`
- Delete: `src/components/home/hero-scene.tsx`
- Modify: `src/app/globals.css` (add the `.band` slant rules)

**Interfaces:**
- Produces: `AngledSection(props: { tone?: "band" | "alt"; first?: boolean; id?: string; labelledBy?: string; className?: string; children: ReactNode })`, which renders a `<section class="band ...">` with `--slant: 56px`. When `first` is set, the top edge is straight.
- Produces: `Disc(props: { src: string; alt: string; size?: number })`, a circular image (default 200px) with `k-drift`.

- [ ] **Step 1: Slant CSS.** Port `.k-slant`, `.k-slant--alt` and `.k-slant:first-child` from `bundle.css` as `.band`, `.band--alt` and `.band--first`. Make the bottom padding `calc(var(--space-8) + var(--slant))` so the clipped edge never covers content (Review Focus 4).
- [ ] **Step 2: Rebuild the hero.** Use `<AngledSection first tone="band">` with a two-column grid (content, then a disc column) that collapses to one column under 640px with the disc first. Keep the copy verbatim: chip, `h1#hero-title` (now `text-on-band`, `font-display`, `clamp(36px,6vw,56px)`), and lead paragraph (`text-on-band-muted`). Then `<HeroSearch />`. The disc uses `/places/demo-aridh-evening-1.jpg`. Draw a gold crescent and three stars as inline SVG (`fill: var(--accent)` and `var(--on-band-muted)`) with `k-drift` and staggered `--i`, marked `aria-hidden`. Add `k-rise` with `--i` 0..3 on the text stack. Remove every `text-shadow`.
- [ ] **Step 3: Delete `hero-scene.tsx`** and its import.
- [ ] **Step 4: Verify.** Run: `pnpm lint && pnpm typecheck`. Then run the screenshot check in Task 8 for `/` at 390 and 1440 wide. Expected: no text clipped by the slant, and Tab to the search button shows a visible light ring on the band (Review Focus 1).
- [ ] **Step 5: Commit.** `git commit -m "feat(home): angled purple hero with drifting moon"`

### Task 7: Home sections

**Files:**
- Modify: `src/components/home/sections.tsx`

**Interfaces:**
- Consumes: `AngledSection` and `Disc` (Task 6), `lift` (Task 4), and the button `onBand` variant (Task 5).

- [ ] **Step 1: Restyle in place.** Keep the copy and the section order from `src/app/page.tsx`.
  - `Categories`, `FeaturedPlaces` and `Trust` stay on `surface`. Tiles become `lift rounded-md shadow-card bg-surface-raised` with no border, and icon tiles use `bg-brand-soft text-brand-strong`.
  - `HowItWorks` becomes `<AngledSection tone="alt">`, with step numbers in `font-display text-accent`.
  - `HourlyBooking` stays on `surface`, and its availability bars use `bg-brand`, with booked slots in `bg-accent`.
  - `Owners` becomes `<AngledSection tone="band">`. Its dashboard mock card stays `bg-surface-raised rounded-lg shadow-lift` and loses `deck`. The primary CTA uses `onBand` and the secondary uses `ghost` with `text-on-band border-on-band-muted`.
  - `FinalCta` becomes `<AngledSection tone="alt">` with one `onBand` button.
- [ ] **Step 2: Add reveal.** Add `k-rise` with `style={{"--i": n}}` on each section's direct children (n = 0, 1, 2…). Keep `section[id]` scroll margins.
- [ ] **Step 3: Verify.** Run: `pnpm lint && pnpm typecheck`. Expected: PASS.
- [ ] **Step 4: Commit.** `git commit -m "feat(home): restyle sections with bands and lift cards"`

### Task 8: Verification, detector and DESIGN.md

**Files:**
- Create: `DESIGN.md` and `.impeccable/design.json` at `kashtat/` (written by the impeccable `document` flow)

- [ ] **Step 1: Full checks.** Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Expected: all pass. The build runs with dummy `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy`, and the home page renders the "could not load" card instead of crashing (Review Focus 5).
- [ ] **Step 2: Screenshots.** Start `pnpm start`, then capture `/` and `/styleguide` at 390×844 and 1440×900, in light and in dark (set `localStorage.kashtat-theme`), with reduced motion emulated so entrance animations are settled. Save to `.impeccable/review/`. Open each file and confirm it is not blank and shows the right page.
- [ ] **Step 3: Detector.** Run: `/root/.claude/skills/impeccable/scripts/impeccable detect --json --changed`. Fix the mechanical findings and record the rest for the reviewer.
- [ ] **Step 4: Document.** Run the impeccable `document` flow to write `DESIGN.md` and `.impeccable/design.json` from the built system.
- [ ] **Step 5: Commit and push.** `git commit -m "docs(design): record purple and gold system"` then `git push origin claude/lucid-meitner-bxqqtk`.
