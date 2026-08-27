# Bugatti — Born to move.

A single-page luxury automotive marketing site: a pinned canvas hero scrubbed by
scroll, followed by editorial sections. Next.js (App Router), Tailwind CSS v4,
Framer Motion.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## The hero

`components/HeroSequence.tsx` pins a full-viewport `<canvas>` for 350vh of
scroll and maps scroll position onto a 150-frame pre-rendered image sequence.

- One `requestAnimationFrame` loop owns every canvas write. Scroll position eases
  into the frame index, so the sequence never snaps and reverses just as
  smoothly as it advances.
- `lib/sequence.ts` loads frames coarse-to-fine (frame 0 and the last frame, then
  every 16th, 8th, 4th, 2nd, and finally all of them), six at a time, decoding
  through `img.decode()` so codec work stays off the main thread. The sequence is
  scrubbable about 0.4s after load and fully resident within a few seconds.
- Until a given frame is resident the canvas draws the nearest one that is, so a
  partially loaded sequence degrades to a coarser scrub rather than to a blank.
- Two frame sets are shipped — 1600×900 for desktop, 900×506 for phones — picked
  by `matchMedia` at runtime.

Every frame is seated on exactly `#060606`, the same value as the page
background, and feathered to it at all four edges. Wherever the canvas
letterboxes there is no visible edge.

`lib/ramp.ts` explains why the scroll-driven values use function transforms
rather than Framer's array ranges.

## Reduced motion

`prefers-reduced-motion: reduce` replaces the canvas with a single static hero
still and stacks the four narrative chapters as ordinary sections. Parallax is
dropped and only opacity fades remain.

## Regenerating the artwork

The frame sequence and the editorial stills are derived from three studio plates
in `tools/plates/`, and are committed under `public/`. To rebuild them:

```bash
pip install pillow numpy
PYTHONPATH=tools python3 tools/extract_stills.py   tools/plates public
PYTHONPATH=tools python3 tools/render_sequence.py  tools/plates public/sequence
```

`tools/render_sequence.py` registers the three plates onto one dolly curve,
sweeps a studio key light along the bodywork, ramps the headlights up, and hides
each plate change inside a dip in the light so the result reads as one
continuous take.

## Notes

- The appointment form in `components/Reserve.tsx` validates and acknowledges
  locally; it has no backend. Point its `onSubmit` at a booking service to make
  it live.
- All copy lives in `lib/content.ts`.
- This is a concept showcase and is not affiliated with Bugatti Automobiles
  S.A.S. The vehicle imagery is generated, not photographed, and the
  specifications are illustrative.

## n8n-mcp

This repository also registers [n8n-mcp](https://github.com/czlonkowski/n8n-mcp)
in [`.mcp.json`](.mcp.json), which runs via `npx n8n-mcp` — no install step. It
runs in docs-only mode by default; node search, documentation lookup and
workflow validation work with no n8n instance required.

To enable the tools that create and deploy workflows against a live instance,
`.mcp.json` reads `N8N_API_URL` and `N8N_API_KEY` from the environment rather
than hardcoding them, since this repository is public:

```bash
# .env — git-ignored, never commit it
N8N_API_URL=https://your-n8n-instance.com
N8N_API_KEY=your-api-key
```

Load it (`set -a && source .env && set +a`) before starting your MCP client,
then restart the client to pick up the change.
