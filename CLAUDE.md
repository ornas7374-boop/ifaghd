# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This repo is a collection of independent projects that share one git history. Nothing is shared between them, and each has its own dependencies. Work inside the project the task is about.

| Path | What it is | Own guidance |
|---|---|---|
| `/` (root `src/`, `package.json`) | "Free gift" landing page: email in, gift unlocked. Next.js 16 App Router, TypeScript, SQLite (`better-sqlite3`), Tailwind v4 | `README.md` |
| `sadu-landing/` | **sadu**, the main active project: an AI that designs a gaming setup from a photo of the customer's room. See below | `sadu-landing/README.md` (landing page only) |
| `sadu-refs/` | Private reference images and style notes for sadu. The images are not committed | `sadu-refs/README.md` |
| `kashtat/`, `livestock-dashboard/` | Separate Next.js apps | `AGENTS.md` (their `CLAUDE.md` imports it) |
| `mcp-gsc/`, `seomachine/` | Separate tools | their own `CLAUDE.md` |
| `open-seo/` | Separate app | `AGENTS.md` |
| `game/` | Static HTML game | `README.md` |

Repo-level Claude skills live in `.claude/skills/` (interior-design-expert, property-staging, t2i-prompt-dialect, page-cro, frontend-design). sadu's planner follows their rules.

## Root gift app

```bash
npm install && cp .env.example .env   # set APP_SECRET (openssl rand -hex 32)
npm run make:placeholder-gift          # first run only
npm run dev | npm run build | npm run lint
npm run subscribers                    # print saved emails from data/app.db
```

The gift file is never linked directly. `/api/gift-file` serves it through a 10-minute HMAC-signed URL tied to the email (`src/lib/token.ts`, `src/lib/gift.ts`).

## sadu-landing

Plain HTML pages plus Vercel serverless functions in Node (CommonJS). There is no build step and no framework. The only dependency is `sharp`.

```bash
cd sadu-landing
npm test                                      # all unit tests (node --test), no network
node --test test/planner/scenarios.test.js    # one file
node --test --test-name-pattern="whole room" test/planner/scenarios.test.js   # one test
npm run test:live                             # real Gemini call (needs GEMINI_API_KEY)
```

**Branches and deploys**

- Production (`sadu-landing.vercel.app`) runs an old commit. Do not merge or promote to it without the owner's explicit approval.
- Work happens on `sadu/planning-engine`. It is deployed as a Vercel **preview**: project `sadu-landing`, root directory `sadu-landing`.
- Preview environment variables hold all the keys. None of them are in code.

### Pages

- `index.html`: the marketing page. It has a waitlist modal and posts events to a Google Apps Script webhook (`apps-script.gs`, configured by `window.SADU_CONFIG`).
- `app/index.html`: the designer UI.
  - The client flow:
    1. `POST /api/design {step:"empty"}` empties the room.
    2. `POST /api/plan` plans on the emptied photo.
    3. `POST /api/design {plan}` draws the design.
    4. `POST /api/evaluate {mode:"structure"}` checks the result. If it fails, the app retries once with a new seed and keeps the better result.
  - Arabic copy, style names (`STYLE_NAMES`) and description suggestions (`SUGGEST`) live in this file.
  - `/app/?style=<key>` pre-selects a style.

### Planning engine (`api/_lib/planner/`)

`planDesign()` in `index.js` is pure code except for one perception call. It runs these steps in order:

`perceive` (Gemini vision → JSON) → `intent` → `roomUnderstanding` → `structure` → `decisions` (style, palette, items, lighting, window dressing) → `spatial` (picks the desk wall: window to the side, door clear, clearance, outlet) → `budget` → `validate`.

It retries with a concrete fix up to `MAX_ATTEMPTS` times. Then it runs:

- `products` (requirements and store links)
- `roomFill` (furnishes the rest of the room with gaming pieces)
- `schedule` (2–7 day build plan)
- `render` (the image prompt)

Important invariants:

- **The render instruction is HMAC-signed** (`sign`/`verify` in `planner/index.js` cover prompt, edit_region, fill_prompt, protect and references). `/api/design` refuses unsigned or edited plans, so the client can never inject a prompt.
- **The structure lock comes first** in the prompt. Walls, ceiling, door, window frame and camera never change.
  - **The floor is always protected**, with no rugs.
  - **Walls change only** when the customer asks (`intent.allow_wall`).
  - **"Empty the room"** (`intent.clear_room`) happens whenever furniture may change. Kept items (`intent.keep`) stay.
- **Prompt length is capped** (`MAX_WORDS` in `render.js`). When it is over, things are dropped in this order: room-fill fillers, then the style fragment line, then optional desk items. Essential items are never dropped.
- FLUX.2 ignores negative wording, so key rules are also stated affirmatively.

### Styles and data

- `api/_lib/setup.js` `STYLES` is the single source of styles. **sadu is gaming setups only.**
  - 5 base styles distilled from the owner's private refs (`planner/examples.js` maps them to reference image numbers).
  - Recipe styles from `data/style_presets_setup.json`, loaded and fixed up in `setupRecipes.js`.
  - Non-gaming recipes (minimal, cozy, home_office) are kept as data but not offered.
- `data/catalog_ikea_sa.json` (owner-supplied, rugs removed) feeds `api/_lib/catalog.js`:
  - Real products for room-fill pieces and curtains.
  - Up to 3 product photos (catalogue ids only, never URLs from the request) go to FLUX.2 on Cloudflare as reference images.
- Pinterest reference lists (`data/sadu-setup-references.json`, `data/sadu-gaming-verified.json`) were only read once to extract text recipes. **Never store, show or serve those images.**

### Image providers (`api/design.js`, chosen by `SADU_DESIGN_PROVIDER`)

| Provider | What it uses |
|---|---|
| `cloudflare` | FLUX.2 Klein (`api/_lib/cloudflare.js`). Keeps only changed pixels, uses the whole image when more than 40% changed, retries on "flagged". Free daily quota |
| `replicate` | FLUX Kontext Pro when `SADU_DESIGN_MODE=kontext`, otherwise FLUX Fill Pro with a mask (`replicateDesign.js`). Paid |
| anything else | Gemini image (`gemini.js`) |

- Gemini (`api/_lib/gemini.js`) falls back automatically when a model is missing, overloaded or retired.
  - It prefers lite vision models, newest first.
  - The image cost guard allows only Flash image models.
- Do not switch providers or spend on paid drawing without the owner's approval.

### Lab endpoint

`api/eval/seglab.js` is guarded by `api/_lib/evalGuard.js`. It works only when all of these hold:

- the deployment is a preview,
- `SADU_EVAL=1`,
- `SADU_LAB_KEY` is set.

It decrypts the private test photos in `eval-photos-enc/` and offers free checks (`cfcheck`, `repcheck`, `refcheck`, `credits`) plus plan/render runs. Every request needs `?photo=p1`. Use it to verify keys and plans on the deployed preview, because the local sandbox cannot reach Gemini, Replicate or Pinterest.

### Tests

`test/planner/fixtures.js` holds simulated room observations. Use them with `planDesign(...)` to test the planner without network. Endpoint tests stub `global.fetch` (see `mockFetch` in `test/planner/engines.test.js`).
