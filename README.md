# MASSIF — design–build atelier

A single-page, art-directed marketing site for a fictional design–build
construction studio, built as a static site with no framework, no build step
and no third-party runtime requests.

The site ships in two languages, each a static page over the same assets:

| | |
|---|---|
| English | `index.html` — LTR, Bodoni Moda + Inter Tight |
| العربية | `ar/index.html` — RTL, Tajawal |

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Art direction

| | |
|---|---|
| Palette | ink `#0a0a0b` · bone `#ece7dd` · brass `#c8a15a` — strictly alternating dark/light sections |
| Display | Bodoni Moda (self-hosted variable) at 3–13rem, tight tracking, italic accents in brass |
| Text | Inter Tight for prose, JetBrains Mono for labels, indices and captions |
| Texture | animated SVG grain overlay, layered radial scrims, no drop-shadowed cards |

## Sections

1. **Hero** — full-bleed dusk photograph, scroll-linked parallax + blur, line-masked headline, ticker rail
2. **The condition** — problem/solution split with a draggable structure ⇄ delivery photo comparator
3. **Capabilities** — editorial index list with a cursor-tracking image peek
4. **The record** — animated counters, oversized pull quote, collaborator marquee
5. **The method** — four-stage stepper driving a live isometric structural model on `<canvas>`
6. **Engagements** — full-width pricing rows that expand on hover, not cards
7. **Begin** — oversized CTA with a cursor-following brass glow, then the footer

## The Arabic edition

`ar/index.html` is a full translation, not a mirrored layout — the copy was
written in Arabic rather than run through the English sentence by sentence.
`assets/css/rtl.css` carries the whole language layer on top of `style.css`:

- **Direction.** Every physical rule is flipped: scrims and radial washes move
  to the side the type now sits on, marquees run the other way, underline and
  wipe transforms swap origin, and the ↗ arrows mirror to ↖.
- **Type.** Tajawal replaces the latin display face, and the thick/thin
  contrast Bodoni gives the English page is carried here by weight instead —
  a light 300 ground with a bold 700 accent word, since Arabic has no italic.
  Letter-spacing is zeroed globally (it severs the cursive joins) and restored
  only on latin and numeric runs.
- **Numerals** stay on Bodoni Moda: the arabic subset carries no latin glyphs,
  so each script resolves to its own face inside one font stack.
- **The comparator** keeps its physical drag axis, but the two phases swap
  sides so the "before" sits on the right, where Arabic reading starts.
- Stage names for the canvas model are read from the DOM, so each language
  labels its own model.

## Implementation notes

- `assets/js/main.js` — ~430 lines of vanilla JS: preloader, `IntersectionObserver`
  reveals, custom cursor, magnetic buttons, comparator, counters, overlay menu
  and the canvas model. Everything is feature-detected; with JS disabled the page
  renders fully as static content.
- The canvas model is hand-rolled isometric projection — segments and translucent
  faces tagged per stage, drawn on progressively, depth-shaded by camera distance,
  auto-fit to the canvas across the yaw sweep.
- Fonts are self-hosted latin subsets in `assets/fonts/` (184 KB total).
  `font-optical-sizing: none` is set deliberately: Bodoni Moda's `opsz` axis
  produces broken outlines on several glyphs when applied automatically.
- Imagery in `assets/img/` is derived from the two source photographs, plus four
  editorial detail crops used by the capabilities hover.
- Respects `prefers-reduced-motion`, keyboard-operable comparator and menu,
  skip link, and secondary text tuned to ≥4.5:1 contrast.

---

## n8n-mcp

This project is also configured to use [n8n-mcp](https://github.com/czlonkowski/n8n-mcp), a Model Context Protocol server that gives AI assistants structured access to n8n's nodes, documentation, and workflow validation tools.

The server is registered in [`.mcp.json`](.mcp.json) and runs via `npx n8n-mcp`, so no separate install step is required — Claude Code (or any MCP-compatible client) will fetch and launch it automatically.

By default it runs in **docs-only mode**: node search, documentation lookup, and workflow validation tools work out of the box with no n8n instance required.

To enable the additional tools that create/deploy workflows against a live n8n instance, `.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from your environment (`${N8N_API_URL}` / `${N8N_API_KEY}`) rather than hardcoding them, since this repository is public and these are sensitive credentials.

1. Copy `.env` (already present locally, git-ignored) or create your own with:
   ```
   N8N_API_URL=https://your-n8n-instance.com
   N8N_API_KEY=your-api-key
   ```
2. Load it into your shell before starting your MCP client, e.g.:
   ```bash
   set -a && source .env && set +a
   ```
3. Restart your MCP client (or run `/mcp` in Claude Code) to pick up the change.

**Never commit `.env`** — it's listed in `.gitignore` for exactly this reason. If this repository is ever made private, credentials can instead be hardcoded directly in `.mcp.json` if preferred.
