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
scroll and maps scroll position onto a 184-frame image sequence — every frame
of a 4.2s reference clip, one continuous orbit of the car from a front
three-quarter, through the flank, to a rear three-quarter.

- One `requestAnimationFrame` loop owns every canvas write. Scroll position eases
  into the frame index, so the sequence never snaps and reverses just as
  smoothly as it advances.
- `lib/sequence.ts` loads frames coarse-to-fine (frame 0 and the last frame, then
  every 16th, 8th, 4th, 2nd, and finally all of them), six at a time, decoding
  through `img.decode()` so codec work stays off the main thread. The sequence is
  scrubbable about 0.4s after load and fully resident within a few seconds.
- Until a given frame is resident the canvas draws the nearest one that is, so a
  partially loaded sequence degrades to a coarser scrub rather than to a blank.
- Two frame sets are shipped — 1440×724 for desktop, 900×453 for phones — picked
  by `matchMedia` at runtime.

The clip is roughly 2:1, wider than any common viewport, so the canvas fits it
to width and fills the leftover height with `#060606` — the same value as the
page background. Each frame's top and bottom are feathered to that colour, so
the letterbox reads as a cinemascope frame rather than as an edge. The car runs
edge to edge in the footage, which is why there is no horizontal overscan on
desktop; phones get 1.16×, the most the car's own extent across the clip allows
without clipping it.

The footage is a bright sunset, so the hero lays a flat `rgba(6,6,6,0.42)` veil
over the canvas and each chapter adds a directional scrim on top. That is what
keeps the page dark and the type readable.

`lib/ramp.ts` explains why the scroll-driven values use function transforms
rather than Framer's array ranges.

## Reduced motion

`prefers-reduced-motion: reduce` replaces the canvas with a single static hero
still and stacks the four narrative chapters as ordinary sections. Parallax is
dropped and only opacity fades remain.

## Regenerating the artwork

All artwork is committed under `public/`. It comes from two sources.

The hero — the scrubbed sequence, the reduced-motion still and the social card —
is cut from the reference clip in `tools/clip/hero.mov`:

```bash
pip install pillow numpy
npm i ffmpeg-static          # or have ffmpeg on PATH
python3 tools/extract_clip_frames.py tools/clip/hero.mov public/sequence
```

The macro photography band is cut from three studio plates in `tools/plates/`:

```bash
python3 tools/extract_stills.py tools/plates public
```

## Notes

- The appointment form in `components/Reserve.tsx` validates and acknowledges
  locally; it has no backend. Point its `onSubmit` at a booking service to make
  it live.
- All copy lives in `lib/content.ts`.
- This is a concept showcase and is not affiliated with Bugatti Automobiles
  S.A.S. The specifications are illustrative. The macro band is generated
  imagery; the hero is the supplied reference clip, whose provenance has not
  been verified — check you hold the rights before using this anywhere public.

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
