# sadu-collector — automatic, authorized collection of interior reference images

Discovers interior photos from **Unsplash** and **Pexels** through their official APIs, analyses every photo with an AI vision model, filters out duplicates and weak images, and stores **metadata and AI descriptions** in Supabase Postgres. The sadu site later retrieves the best references per room and style.

It runs by itself: nobody types searches or uploads files. It never touches the live site.

## What it does, in order

| Step | What happens | Costs money? |
|---|---|---|
| 1. Discover | Picks the next search terms from a built-in plan (room × style terms, including Gulf terms such as "majlis"). Pages through results; cursor saved after every page. API pages cached for 24 h | No |
| 2. Pre-filter | Drops photos that are too small or have extreme aspect ratios, using API metadata only (no download) | No |
| 3. Download | In memory only, from `images.unsplash.com` / `images.pexels.com` only, https only. A dead link (404/410) is recorded as `broken` | No |
| 4. Local quality | Sharpness, brightness, real size. Blurry, near-black or blown-out images are rejected | No |
| 5. Duplicates | 64-bit perceptual hash, Hamming distance ≤ 8 against everything already seen, across both sources | No |
| 6. AI analysis | Room, style, furniture, materials, colours, lighting, architecture, camera angle, quality, people, watermark | **Yes** (Replicate) |
| 7. Decide | Rejects: not an interior, unknown room, low confidence, detail/aerial shot, watermark, people, low quality, or **objects that do not belong in that room** (a bed in a kitchen) | No |
| 8. Store | URL (hotlinked), photographer, source page, license, dimensions, hash, room, style, objects, materials, colours, relevance score | No |

Photos already in the database (accepted **or** rejected) are never downloaded or classified again. A finished search is reopened after 14 days, so the library keeps growing as the sources add photos.

## Safety and legal design

- **No scraping, no bypassing:** only the official APIs with your own keys. Pinterest, Behance and X are not used.
- **Images are not copied.** Only metadata and derived descriptions are stored; images stay at the source and are credited (photographer + source link with referral parameters, license name and link).
- **Terms still apply to you:** read the current [Unsplash API terms](https://unsplash.com/api-terms) and [Pexels API terms](https://www.pexels.com/api/) before large-scale collection and before showing images publicly. In particular check what they say about automated bulk use, caching and attribution. I could not read them from the build environment, so this is **your** check. Unsplash demo keys allow about 50 requests/hour; higher limits need an approved application.
- **Keys** come from environment variables only, are sent only in the `Authorization` header, and are redacted from all logs.
- **Database:** Row Level Security is enabled with no policies, so Supabase's public Data API cannot read or write these tables. Use a direct/pooler connection with the database role.
- **TLS stays verified.** For Supabase set `DATABASE_CA_FILE` to the CA certificate downloaded from the dashboard (Database → Settings → SSL). Do not disable verification.

## Setup

1. **Keys (free):** Unsplash → https://unsplash.com/oauth/applications → create an app → *Access Key*. Pexels → https://www.pexels.com/api/ → request a key.
2. **Database:** a Supabase project for sadu → *Connect* → *Session pooler* connection string → `DATABASE_URL`.
3. `cd sadu-collector && npm install`
4. Put the variables in your shell (or a `.env` you never commit):

   ```bash
   export UNSPLASH_ACCESS_KEY=...
   export PEXELS_API_KEY=...
   export REPLICATE_API_TOKEN=...
   export DATABASE_URL=postgresql://...
   export DATABASE_CA_FILE=/path/to/supabase-ca.crt
   ```
5. `node bin/cli.js migrate`
6. `node bin/cli.js probe` — **run this first.** It makes one request to each service and prints the real response shapes, rate-limit headers and whether the vision model id works. The adapters follow the public documentation from memory; `probe` is how that is verified. If something differs, send me the output and I adapt the adapter.
7. `node bin/cli.js collect --dry-run --max-classify 5` — decides but writes nothing (still pays for ≤ 5 vision calls).
8. `node bin/cli.js collect` — a real run.

## Cost control

| Setting | Default | Meaning |
|---|---|---|
| `--max-classify` | 60 | Paid vision calls per run. A run stops here and resumes next time on the same page |
| `--max-api-calls` | 60 per source | API calls per run |
| `--max-pages` / `--max-queries` | 2 / 6 | How much is explored per run |

Estimated vision cost: roughly $0.005–0.015 per photo (a 640 px image to a Claude model on Replicate) — **an estimate; check your Replicate dashboard after the first run.** Only photos that pass all the free checks reach the paid step, so 60 classifications per run is about $0.30–0.90.

## Running it automatically

The tool is a plain command, so any scheduler works. A GitHub Actions example (store the keys as repository secrets; the `schedule` line is what makes it autonomous, so enabling it is your decision):

```yaml
name: collect
on:
  workflow_dispatch:
  # schedule: [{ cron: "17 3 * * *" }]    # daily at 03:17 UTC, enable when ready
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd sadu-collector && npm ci && node bin/cli.js collect --max-classify 100
        env:
          UNSPLASH_ACCESS_KEY: ${{ secrets.UNSPLASH_ACCESS_KEY }}
          PEXELS_API_KEY: ${{ secrets.PEXELS_API_KEY }}
          REPLICATE_API_TOKEN: ${{ secrets.REPLICATE_API_TOKEN }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - run: cd sadu-collector && node bin/cli.js verify
        env: { DATABASE_URL: "${{ secrets.DATABASE_URL }}" }
```

Run `verify` weekly: it re-checks stored image URLs and marks dead ones `broken`, so broken images never come back from `search`.

## Using the library

`node bin/cli.js search --room kitchen --style warm_luxury --limit 10` returns the most relevant accepted references with their analysis (objects, materials, colours, lighting, architecture). The site uses those descriptions to steer generation. It reads the **principles**, it does not copy the photos.

## Tables

`reference_images` (the library), `collection_queries` (search terms and resume cursor), `api_cache`, `collection_runs` (every run's stats and errors), `schema_migrations`.

## Tests

`npm test` — 30 tests with an in-memory Postgres, synthetic photos and fake APIs: duplicates (resized/recompressed, across sources), every rejection reason, cost cap and resume without skipping, rate-limit stop per source, bad key, transient errors, dry run, link check, SSRF host limits, RLS.
Not covered by tests, because it needs the real services: the real response shapes (use `probe`), the real vision model output quality (review the first 50 results by eye), and Supabase TLS.
