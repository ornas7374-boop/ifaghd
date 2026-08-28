"""
Cuts the hero scroll sequence out of the reference clip.

The hero is driven by a real 4.2s take of the car on a coastal road at sunset —
one continuous orbit from a front three-quarter, through the flank, to a rear
three-quarter. Every frame of the clip is kept, so scroll position maps onto
genuine camera motion rather than anything synthesised.

The clip is 1062x534 (roughly 2:1), which is wider than any common viewport, so
the canvas fits it to width and letterboxes on #060606. Those bars read as a
cinemascope frame rather than as an edge, which is why the frames are NOT
padded to 16:9 here.

Usage:
    python3 tools/extract_clip_frames.py <clip.mov> public/sequence
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image

BG = (6, 6, 6)

# Fraction of frame height faded to the background at the top and bottom edges.
# Only the horizontal edges: the frame is fitted to the viewport width, so its
# left and right sides land on the screen edge, where a fade would read as a
# vignette rather than as a frame melting into the page.
FEATHER = 0.045

# name, width, height, ffmpeg -q:v (2 = best, 31 = worst)
OUTPUT_SETS = [
    # 1.36x upscale of the source; soft under a loupe, correct at page size.
    ("desktop", 1440, 724, 6),
    # A downscale, so this set is genuinely crisp.
    ("mobile", 900, 453, 5),
]


def ffmpeg_bin() -> str:
    """ffmpeg-static if it is installed, otherwise whatever is on PATH."""
    for candidate in ("ffmpeg", "./node_modules/ffmpeg-static/ffmpeg"):
        found = shutil.which(candidate) or (
            candidate if os.path.isfile(candidate) else None
        )
        if found:
            return found
    raise SystemExit("ffmpeg not found. Install it, or `npm i ffmpeg-static`.")


def feather_edges(path: str, quality: int) -> None:
    """Fades a frame's top and bottom into #060606 so the letterbox has no seam."""
    img = Image.open(path).convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    h = arr.shape[0]

    ys = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]

    def ramp(t: np.ndarray) -> np.ndarray:
        v = np.clip(t / FEATHER, 0.0, 1.0)
        return v * v * (3.0 - 2.0 * v)  # smoothstep, so there is no hard knee

    mask = (ramp(ys) * ramp(1.0 - ys))[:, :, None]
    bg = np.array(BG, dtype=np.float32)
    out = bg + (arr - bg) * mask
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(
        path, quality=quality, optimize=True, progressive=True
    )


def extract(ff: str, clip: str, out_dir: str, w: int, h: int, q: int) -> int:
    os.makedirs(out_dir, exist_ok=True)
    for stale in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, stale))

    subprocess.run(
        [
            ff, "-i", clip,
            # lanczos holds the bodywork edges together through the resample;
            # the light unsharp puts back the bite the upscale costs.
            "-vf", f"scale={w}:{h}:flags=lanczos,unsharp=5:5:0.5",
            "-q:v", str(q),
            # -vsync 0 keeps every source frame instead of resampling to a
            # target rate, so the scrub tracks the original motion exactly.
            "-vsync", "0",
            os.path.join(out_dir, "frame_%04d.jpg"),
            "-y",
        ],
        check=True,
        capture_output=True,
    )

    # ffmpeg numbers from 1; the loader indexes from 0.
    names = sorted(os.listdir(out_dir))
    for i, name in enumerate(names):
        os.rename(
            os.path.join(out_dir, name),
            os.path.join(out_dir, f"frame_{i:04d}.jpg.tmp"),
        )
    for name in sorted(os.listdir(out_dir)):
        os.rename(
            os.path.join(out_dir, name),
            os.path.join(out_dir, name[: -len(".tmp")]),
        )

    # ffmpeg's -q:v scale is not PIL's; re-encode the feathered frames at a
    # comparable JPEG quality rather than trying to map between them. The whole
    # sequence ships in the page weight, so this is kept as lean as the footage
    # tolerates — sunset gradients band before the bodywork softens.
    jpeg_quality = 78 if q <= 5 else 76
    for name in sorted(os.listdir(out_dir)):
        feather_edges(os.path.join(out_dir, name), jpeg_quality)

    return len(names)


def main() -> None:
    clip, dst = sys.argv[1], sys.argv[2]
    ff = ffmpeg_bin()

    counts: set[int] = set()
    manifest: dict = {"sets": {}}

    for name, w, h, q in OUTPUT_SETS:
        out_dir = os.path.join(dst, name)
        count = extract(ff, clip, out_dir, w, h, q)
        counts.add(count)
        total = sum(
            os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir)
        )
        manifest["sets"][name] = {"width": w, "height": h}
        print(f"{name}: {count} frames, {total / 1024 / 1024:.2f} MB")

    if len(counts) != 1:
        raise SystemExit(f"sets disagree on frame count: {counts}")

    manifest["frames"] = counts.pop()
    os.makedirs(dst, exist_ok=True)
    with open(os.path.join(dst, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)
    print(f"\nFRAME_COUNT = {manifest['frames']}")


if __name__ == "__main__":
    main()
