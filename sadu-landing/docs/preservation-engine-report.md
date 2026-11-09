# sadu — Architectural Preservation Engine: Technical Report

**Date:** 3 November 2026 · **Branch:** `sadu/preservation-engine` · **Status:** preliminary milestone, not connected to production

## 1. Status and isolation

| Item | State |
|---|---|
| Engine code | `sadu-landing/api/_lib/preservation.js` on branch `sadu/preservation-engine` only |
| Production branch (`claude/install-n8n-mcp-eh9tul`) | Engine commit reverted; tree identical to the last deployed commit `cafaa3a` |
| Production generation workflow (`api/design.js`) | Unchanged |
| HTTP endpoints added | None. `api/_lib/` is a library folder; Vercel does not expose files whose path starts with `_` as functions |
| Tests | 20 unit tests, all passing (`npm test` in `sadu-landing/`) |
| Dependencies | One: `sharp` (image decoding). `npm audit`: 0 vulnerabilities |
| Secrets in the repository | None found (scan for Replicate, Anthropic, Supabase and private-key patterns) |

## 2. What the engine does

Input: the **original** room photo, the **generated** design, a list of **protected architectural elements** (each a mask with a type: `ceiling`, `wall`, `window`, `door`, `column`, `beam`, `builtin`), and optionally the **occluders** mask (movable objects in the original: furniture, curtains) and the **editable** mask.

Output: two independent verdicts.

| Verdict | Question | Failure codes |
|---|---|---|
| `preservation` | Is this the same physical room, seen from the same camera? | `aspect_changed`, `camera_framing_changed`, `element_removed`, `element_moved`, `element_changed` |
| `design` (scope: basic) | Did the interior actually change, and is any opening blocked by new furniture? | `no_real_redesign`, `door_blocked`, `window_blocked` |

`accepted = preservation.passed AND design.passed`. A preservation failure is never reported as a design issue, and the reverse. The full design-quality review (function, relevance of objects, realism) is a separate, later stage; the `design` verdict here only covers what pixels can show.

## 3. Algorithm

All analysis runs on downscaled greyscale copies: 256 px wide for element checks, 128 px wide for the camera search. Both images are decoded through a guarded loader (max 15 MB, max 40 MP, strict decoding).

### Step 1 — Aspect ratio
If the generated aspect ratio differs from the original by more than 1 %, the result fails immediately (`aspect_changed`). A different output resolution with the same aspect is fine.

### Step 2 — Camera framing
1. **Global search.** Sobel edges of the protected architecture in the original are matched against the generated image over zoom 0.85–1.18 and shift ±10 % (coarse grid, then a fine search around the optimum). The score is normalised edge correlation. Identity is always a candidate.
2. **Preservation vote.** If the best transform is not the identity, each element with enough structure (≥ 30 edge points) is checked twice with the structure test of Step 3: once at the original position, once under the best transform. The camera counts as changed only if more elements are **actually found intact** under the new transform than at the original position. Plain elements (a bare ceiling, a thin wall band) cannot discriminate and do not vote.
3. **Fallback.** If no element can vote (no masks, or only plain elements), the global search decides alone.

Why the vote: a single removed window changes the edge pattern enough to make the global search prefer a wrong transform. Edge agreement alone misreported "window removed" as "camera changed"; requiring elements to be found intact fixed this.

### Step 3 — Each protected element
The element mask minus the occluders mask is tiled into 8×8 windows (stride 4). A window is **preserved** if:
- it has texture in the original and its zero-normalised cross-correlation (ZNCC) with the generated window is ≥ 0.55. ZNCC ignores brightness and contrast, so a global relight (for example the darker night-luxury style) is not an architectural change;
- or it is plain in the original and at least 75 % of the generated window's pixels stay within 0.06 of its median ("mostly plain"). This allows thin additions such as a curtain rod or a pendant cord.

An element passes if its preserved share reaches its type threshold:

| Type | Threshold | Reason |
|---|---|---|
| ceiling | 0.80 | pendant lights may cover part of it |
| wall (upper) | 0.75 | art, mirrors, shelves may cover part of it |
| window | 0.60 | curtains may cover the sides |
| door | 0.70 | |
| column, beam | 0.80 | |
| builtin, default | 0.75 | |

A failing element is classified:
- **moved**: found intact at a pure translation (same scale) along its wall;
- **removed** (windows and doors): most of its lost windows became plain and match the brightness of the wall around the opening (within 0.08);
- **occluded** (windows and doors): covered by new content that is not wall. This is a **design** issue (`door_blocked`, `window_blocked`), because the opening still exists;
- **changed** (ceiling, walls, columns...): new structure appeared, for example coffers or LED lines in the ceiling;
- **unverifiable_after_reframing**: the camera changed, so the element cannot be judged at the original position.

### Step 4 — Did the interior change?
Inside the editable area (protected architecture excluded, original occluders included), the share of windows that are **not** preserved must be ≥ 20 %. A relight alone does not count, because ZNCC ignores brightness.

### Method B — compositing
`compositeProtected()` pastes the protected architecture from the original over the generated image with a feathered edge. Pixels of the original's occluders (grown by 4 px) are never restored, so old furniture cannot reappear. It must only be used when the camera check passed; otherwise misaligned architecture would be pasted.

## 4. Evidence so far

### 4.1 Unit tests on a synthetic room (20 / 20 passing)
A room is drawn in SVG (ceiling, back wall, window with a city view, door, plank floor, furniture) so that every change is known exactly.

| Case | Expected verdict | Result |
|---|---|---|
| Identical image | preservation ✓, design ✗ (`no_real_redesign`) | ✓ |
| Relight only | preservation ✓, not a redesign | ✓ |
| Furniture redesigned | accepted | ✓ |
| Redesign + darker lighting | accepted | ✓ |
| Redesign + curtains + pendant | accepted | ✓ |
| Window removed | preservation ✗ `element_removed`, camera **not** blamed | ✓ |
| Window moved | preservation ✗ `element_moved`, camera not blamed | ✓ |
| Door removed | preservation ✗ `element_removed` | ✓ |
| New wardrobe in front of the door | preservation ✓, design ✗ `door_blocked` | ✓ |
| Ceiling coffers + LED | preservation ✗ `element_changed` | ✓ |
| Zoom 10 %, shift 5 % | preservation ✗ `camera_framing_changed` | ✓ |
| Zoom without element masks | camera change still detected | ✓ |
| Aspect ratio changed | immediate failure | ✓ |
| Same framing, smaller output | accepted | ✓ |
| Old furniture covered the door, removed in the design | no false failure when the occluders mask is given; misjudged without it (control) | ✓ |
| Composite repairs a removed window | accepted, no ghosting outside the mask | ✓ |
| Composite with occluders | old furniture never restored | ✓ |
| Invalid or oversized input | rejected | ✓ |

### 4.2 Camera check on the 50 reference photos
Only the camera check was tested on real photos, because no architectural masks exist for them yet.

| Transformation | Expected | Correct |
|---|---|---|
| 80 % size + 30 % darker + JPEG quality 72 | camera unchanged | 50 / 50 |
| 8 % zoom | camera changed | 50 / 50 |
| 4 % shift | camera changed | 50 / 50 |

Measured transforms were close to the truth: zoom 1.085–1.11 for a true 1.087, shift 3.5–4.3 % for a true 4 %.

This run caught a real defect: an earlier revision ignored the camera whenever no element masks were given. The unit tests had not covered that path; a regression test now does.

**What this evidence does not show.** None of these numbers is a preservation accuracy. The synthetic room is clean and geometric; the 50 photos are mostly polished renders, several AI-generated; and no image here was produced by a generative model. The engine has not yet judged a single real generated design. No accuracy figure (90 % or any other) may be claimed until the evaluation in Section 7 is done.

## 5. Known limitations

1. **Thresholds are uncalibrated.** Every number in Section 3 was chosen on synthetic cases. They must be fitted on real generated results (Section 7).
2. **Wall repaint is not detected.** Structure checks ignore brightness, and the "mostly plain" check is relative to the window's own median. A plain wall repainted in another colour therefore passes. Repaint is not allowed in strict mode, so a colour check relative to the global lighting shift is needed.
3. **Floor material is not checked.** The floor is excluded because rugs and furniture legitimately cover it. A full floor replacement (forbidden) would only show up through framing. This needs an output-side segmentation check (Section 6.4).
4. **Removed vs occluded is a brightness heuristic.** It can misjudge furniture painted the same colour as the wall, strong lighting gradients near an opening, or a wall that was also repainted.
5. **Rotation and perspective warp are not modelled.** Only zoom and shift are searched. A small rotation would show up as element failures with less precise reasons.
6. **The camera vote can rest on one element.** In the zoom test only the window voted; the door's best transform was slightly off. With real segmentation masks there will usually be more voting elements, but the margin should be measured.
7. **Large allowed objects can cause false failures.** A large chandelier may cover more than 20 % of a ceiling; deep curtains more than 40 % of a window.
8. **Quality depends on the masks.** Rectangles are only used in tests. With rectangles, compositing copied an old bed back; production masks must contain architecture pixels only (Section 6).
9. **Speed.** About 1.4 s per validation on this machine, mostly the brute-force camera search. Acceptable for now; it can be made coarse-to-fine if needed.

## 6. Architectural masks from semantic segmentation

### 6.1 Model
A semantic segmentation model trained on ADE20K covers the needed classes: `wall`, `floor`, `ceiling`, `windowpane`, `door`, `column`, `stairs`, plus furniture classes (`bed`, `sofa`, `cabinet`, `table`, `chair`, `curtain`, `lamp`...). Candidates: OneFormer, Mask2Former or SegFormer trained on ADE20K, run on Replicate. Availability, licence and price on Replicate will be confirmed before use; a depth model (Depth Anything V2) is optional for free-floor estimation.

### 6.2 From classes to masks
| Engine mask | Built from |
|---|---|
| `ceiling` | ceiling class |
| `window_N`, `door_N` | windowpane / door classes, split into connected components; windows dilated by a few pixels so the frame is included |
| `wall` (upper) | wall class above the top of the tallest occluder and above window sill height |
| `column`, `beam` | column class; beams from ceiling-adjacent structure where detected |
| occluders | all furniture, curtain, lamp and decor classes, grown by a few pixels |
| editable | floor + lower wall + occluders |

Clean-up: drop components smaller than 0.2 % of the image, erode protected masks by 2 px at the boundary with occluders, fill small holes.

### 6.3 Segmentation quality gate
If the original has no detectable wall/floor/ceiling layout, or mask confidence is low, the result is marked **unverifiable**, never auto-accepted.

### 6.4 Second opinion on the output
Segmentation also runs on the generated image. For each protected element the engine then has an independent check: is there still a window (or door) class at that location (IoU with the original)? Is furniture covering it (occluded) or wall (removed)? Does the floor class keep its outline? This replaces the brightness heuristic of limitation 4 where segmentation is confident, and covers the floor gap of limitation 3.

### 6.5 Validating the masks
On the evaluation set (Section 7), architectural masks are hand-labelled for every photo and compared with segmentation output (IoU per class). Segmentation errors are reported separately from validator errors.

## 7. Comparing methods A, B and C

| Method | Description |
|---|---|
| A | Current `flux-kontext-pro`, with the strict prompt (furniture, lighting fixtures, textiles and decor only; no finish changes) |
| B | A, then `compositeProtected()` restores the architecture, only when the camera check passed |
| C | Masked inpainting (a FLUX Fill–type model): only the editable mask is generated; protected pixels are untouched by construction. The exact Replicate model is confirmed before the run |

### 7.1 Protocol
- **Inputs:** the same photos, the same two styles, the same room labels and the same seed where the model supports one.
- **Per result, recorded automatically:** validator verdicts and codes, latency, cost.
- **Per result, rated by you (blind, method labels hidden, order shuffled):**
  - same room? (yes / no);
  - which element changed, if any;
  - redesign quality (1–5);
  - realism (1–5);
  - visible seams or ghosting (yes / no).
- **Selection rule:**
  1. Highest human "same room" rate.
  2. Among methods within the statistical margin of the best, the one with better redesign quality and realism.
  3. Then cost and latency.
- Method C can win on preservation and lose on realism (seams, furniture that ignores the room's light), which is why both are rated.

### 7.2 Sample size and what it can support
| Photos × styles per method | 95 % margin on a rate near 90 % |
|---|---|
| 20 × 2 = 40 | about ± 10 points |
| 50 × 2 = 100 | about ± 6 points |

With 20 photos the comparison can show large differences between methods, but cannot confirm a 90 % target. Confirming a target needs about 50 photos.

## 8. Measuring real-world performance

1. **Dataset.** Real "before" photos taken with phones: varied rooms (majlis, bedroom, kitchen, living, bathroom), lighting (day, night, mixed), sizes and clutter. Start with 20, grow to 50 or more. EXIF location data is stripped on ingestion; photos are used for evaluation only.
2. **Ground truth.** You label every generated result: preserved or not, and which element failed. A second rater on a subset measures agreement.
3. **Validator metrics** (the validator is the gate, so its errors matter most):
   - **false accept rate:** a changed room presented as a success. This is the most important number;
   - **false reject rate:** a good design thrown away;
   - precision and recall of each failure code, reported per element type.
4. **Calibration without self-deception.** Thresholds are fitted on a calibration split (about 60 %) and reported on a held-out split (about 40 %) that is never used for tuning.
5. **Targets (for your confirmation):**
   - false accepts as low as practical, proposed ≤ 5 %;
   - preservation rate of the chosen method reported with its confidence interval.
6. **After launch.** Log every verdict, audit a weekly sample by hand, and add a "this is not my room" button whose reports feed back into the evaluation set.

## 9. Security

| Area | State |
|---|---|
| Credentials | None in the repository. `REPLICATE_API_TOKEN` exists only as a sensitive Vercel environment variable. That token was pasted in chat earlier and should be rotated before the evaluation run |
| Inputs | Guarded decoding (size, pixel and strict-decode limits) blocks oversized files and decompression bombs |
| Endpoints | None added. If an evaluation endpoint is added later, it must sit behind Vercel authentication, accept only image types, and enforce a per-user rate limit |
| Dependencies | `sharp` only; `npm audit` clean; lockfile committed |

### Network access for the evaluation
| Option | How it works | Risks |
|---|---|---|
| **1. Run the evaluation on a protected Vercel preview (recommended)** | A preview deployment of this branch runs it. The key stays in Vercel; the sandbox network is not widened | The preview must stay behind Vercel authentication, and the evaluation endpoint must be removed afterwards |
| 2. Allow `api.replicate.com` and `replicate.delivery` in this environment | The sandbox calls Replicate directly | The Replicate key would have to be available inside this session (exposed to the session and its logs). Your test photos would leave from this environment as well as from Vercel. The allowance stays in place until you remove it |

## 10. Decisions needed before any further implementation

1. Approve this approach for masks (Section 6) and the A/B/C protocol (Section 7).
2. Choose the network option (Section 9); option 1 is recommended.
3. Rotate the Replicate key.
4. Provide the real "before" photos: 20 to compare methods, 50 to confirm thresholds.
5. Confirm the false-accept target (proposed ≤ 5 %).

No production integration or further implementation will happen until you approve.
