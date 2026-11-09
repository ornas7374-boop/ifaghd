# sadu — A/B/C evaluation runbook

Isolated testing only. Nothing here touches production.

## 0. What is where

| Item | Where |
|---|---|
| Code | branch `sadu/preservation-engine` (production branch unchanged) |
| Evaluation page | `/eval/` on the **Preview** deployment of that branch (login required) |
| Endpoints | `/api/eval/probe`, `/segment`, `/generate`, `/validate`: answer only when `VERCEL_ENV=preview`, `SADU_EVAL=1` and `REPLICATE_API_TOKEN_EVAL` exist, otherwise 404 |
| Results | stored in your browser only, until you export them |

## 1. Replace the exposed Replicate key and revoke the old one

The key pasted in chat earlier is the one production uses (`REPLICATE_API_TOKEN`, Production + Preview). Revoking it without a replacement stops the live `/app` design page. Do the steps in this order:

1. Replicate → https://replicate.com/account/api-tokens → **Create token** twice:
   - `sadu-production`
   - `sadu-eval`
2. Vercel → project `sadu-landing` → **Settings → Environment Variables**:
   - Edit `REPLICATE_API_TOKEN` → paste the `sadu-production` token → keep **Production** (untick Preview) → Save. *This only replaces a secret value; no code or data changes.*
   - Add `REPLICATE_API_TOKEN_EVAL` → paste the `sadu-eval` token → **Preview only** → type **Sensitive** → Save.
3. Replicate → API tokens → **delete the old token** (the one starting `r8_6pVg…`).
4. **Verify the old key is revoked.** Run this from your own computer, not in this chat:

   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <OLD_TOKEN>" https://api.replicate.com/v1/account
   ```

   Expected: `401`. A `200` means the old key still works.
5. Optional but recommended: set a monthly **spend limit** in Replicate billing.

Never paste a token into chat. I cannot see or test tokens from here, so revocation must be confirmed by you (step 4).

## 2. Redeploy the preview

New environment variables only apply to new deployments. After step 1, tell me and I create a fresh preview of the branch (or use Vercel → Deployments → the preview → **Redeploy**).

## 3. Probe the models (once)

Open `https://<preview-url>/eval/` (Vercel login).

1. **Check the models.** All three must show `ok: true`:
   - segmentation;
   - methodA (`flux-kontext-pro`);
   - methodC (`flux-fill-pro`).
2. Add one photo (section 2), then **Try segmentation on the first photo**.
3. **Download the probe result** and send me the JSON file.

The probe shows the real output format of the segmentation model. If it says `unsupported`, I adapt the reader to the real format before any evaluation run. Nothing is guessed.

## 4. Photos

- **Real "before" photos taken with a phone:** rooms as they are, not designer renders.
- **Mix of rooms:** bedroom, living, majlis, kitchen, dining (muqallat), bathroom, office.
- **Mix of conditions:** day and night, small and large, tidy and cluttered.
- **Size:** 20 photos is enough to compare the methods. About 50 are needed to support threshold decisions.
- Set the room type under each photo.
- Photos are downscaled to 1024 px and re-encoded before sending, which removes EXIF and location data.

## 5. Run

- Choose the styles (both are ticked by default) and press **Run the test**.
- **Per photo and style:**
  - 1 segmentation;
  - 2 generations (A and C);
  - 3 validations (A, B and C). B reuses A's image, so it costs no extra generation.
- **Expected cost:** about $0.10–0.15 per photo and style, so roughly **$4–6 for 20 photos × 2 styles**. This is an estimate; check your Replicate dashboard.
- **If a step fails:** press Run again. Completed results are kept and only failed ones are repeated.

## 6. Blind rating

Press **Start rating**. Results appear in random order, with no method name and no validator verdict. For each one answer:
- same room?
- what changed, if anything?
- design quality (1–5);
- realism (1–5);
- visible seams?

Rate in good light, at full size.

## 7. Export and send

**Download results (without images)** and send me the JSON file. I run `node scripts/analyze-eval.js` on it and produce the comparison report:
- A/B/C results;
- per-category accuracy;
- validator false acceptance and false rejection;
- failure analysis;
- recommendation.

**Statistical note:**
- Showing false acceptance ≤ 5% requires at least ~73 rated results where the room actually changed, even with zero validator mistakes.
- If the run has fewer, the report states that the target is **not demonstrated**.
- A second rater on a subset of results makes the ground truth more reliable.

## 8. After the evaluation

- Delete `REPLICATE_API_TOKEN_EVAL` and `SADU_EVAL` from Vercel (or keep them for later runs).
- Use **Clear all local data** on the page to remove photos from the browser.
