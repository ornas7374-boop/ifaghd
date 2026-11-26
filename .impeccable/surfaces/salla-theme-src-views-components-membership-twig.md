---
version: 1
slug: "salla-theme-src-views-components-membership-twig"
primary_target: "salla-theme/src/views/components/membership.twig"
related_targets: ["membership/preview.html"]
---

# Surface: /membership (آفاق+)

Scope: membership landing page, Salla Twilight theme component. Visitor mode: Persuade. Build path: code-led (no image generation in this harness).

Audience: readers of self-development, psychology and business books, mostly on phones. Job: decide whether آفاق+ is worth it and pick a plan. Action: choose monthly or yearly (primary: yearly) or create a free account. Proof on hand: the store's own upcoming editions (titles supplied in Salla), real prices; no testimonials or counts. Constraints: established design system (ink/canvas/soft-cloud, pills, no shadows, radius-none containers, one primary per screen), copy locked in docs/copy-membership.md, unconfirmed facts stay flagged.

## Direction contract

THESIS: The membership is a front-row seat to the store's own shelf. The page opens on the shelf itself, not on a banner about savings; it refuses the category default of a headline over three benefit cards and a pricing table.

OWN-WORLD: The design system as shipped: canvas page, soft-cloud studio gray under every cover, ink type and pills, hairline rules, Inter/IBM Plex Sans Arabic for UI and Bebas Neue/Noto Kufi Arabic only for the campaign line. Covers carry all colour; bronze appears only as the "قريباً" release-date marks on the shelf.

STORY: The visitor sees the store's coming editions lined up, understands members read them first, sees the three benefits as one sentence, compares Free / Monthly / Yearly, checks the savings for their own reading pace, clears doubts in the FAQ, and subscribes yearly.

FIRST VIEWPORT: Desktop: Arabic campaign line at display scale across the top (inline-start aligned), a full-bleed horizontal shelf of 5 covers at 4:5 on soft-cloud occupying the middle band, each with title and a bronze release mark; under the shelf, one line of the three benefits and the ink "اختر خطتك" pill at inline-start. Mobile: line, a horizontally scrolling shelf with the next cover peeking, then benefits and the pill above the fold.

FORM: Editions shelf, position 4 of 7 on the ranked list. seed:4b89a6ed3d01fe5e (degraded roll: no challengers, no quality-bar boards). Signature interaction: the shelf scrolls with snap and drag on touch; on desktop, hovering a cover lifts it 6px with a duration-slow ease-enter tilt while its release mark sharpens. Motion grammar: one staggered reveal of the shelf covers on load (duration-reveal, duration-stagger), nothing else animates on entry.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
