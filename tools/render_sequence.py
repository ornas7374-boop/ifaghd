"""
Pre-renders the scroll-scrubbed hero frame sequence for the Bugatti page.

Source plates are three studio stills of the same car, shot on a pure black
void at three increasing yaw angles. The renderer registers them onto a
common car-centre / car-width curve, dollies the camera forward across the
whole timeline, sweeps a studio key light along the bodywork, and ramps the
headlights up. The two plate changes are hidden inside a light dip so the
sequence reads as one continuous take.

Output: public/sequence/<set>/frame_XXXX.jpg on exact #060606.
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from PIL import Image

BG = (6, 6, 6)                 # #060606 — identical to the page background
FRAMES = 150
CAR_THRESHOLD = 26             # luma cutoff used to find the car in the plate

# Plate order: frontal + distant  ->  front three-quarter  ->  three-quarter side
PLATES = ["plate_a.jpg", "plate_b.jpg", "plate_c.jpg"]

# Normalised timeline position of each plate change, and its half-width.
SWITCHES = [(0.30, 0.038), (0.56, 0.038)]

OUTPUT_SETS = [
    # name,     width, height, jpeg quality
    ("desktop", 1600, 900, 82),
    ("mobile", 900, 506, 80),
]


def ease_in_out(t: float) -> float:
    """Slow, expensive easing — no overshoot, no bounce."""
    return t * t * (3.0 - 2.0 * t)


def ease_out(t: float) -> float:
    return 1.0 - (1.0 - t) ** 3


def car_bbox(gray: np.ndarray) -> tuple[int, int, int, int]:
    mask = gray > CAR_THRESHOLD
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


class Plate:
    def __init__(self, path: str):
        img = Image.open(path).convert("RGB")
        self.rgb = np.asarray(img).astype(np.float32)
        gray = np.asarray(img.convert("L")).astype(np.float32)
        x0, y0, x1, y1 = car_bbox(gray)
        self.w, self.h = img.size
        self.car_w = x1 - x0
        self.car_cx = (x0 + x1) / 2.0
        self.car_cy = (y0 + y1) / 2.0
        # Normalised car width, used to put every plate on one dolly curve.
        self.car_w_frac = self.car_w / self.w


def sample_plate(plate: Plate, out_w: int, out_h: int,
                 car_w_frac: float, cx_frac: float, cy_frac: float) -> Image.Image:
    """Resample a plate so its car lands at the requested size and centre."""
    target_car_px = car_w_frac * out_w
    scale = target_car_px / plate.car_w
    src_w = out_w / scale
    src_h = out_h / scale
    # Source rect centred on the car centre, offset so the car lands on target.
    left = plate.car_cx - cx_frac * src_w
    top = plate.car_cy - cy_frac * src_h
    return Image.fromarray(plate.rgb.astype(np.uint8)).transform(
        (out_w, out_h),
        Image.EXTENT,
        (left, top, left + src_w, top + src_h),
        resample=Image.BICUBIC,
        fillcolor=BG,
    )


# How far in from each edge the plate is feathered back down to the background.
FEATHER = {"top": 0.06, "bottom": 0.10, "side": 0.035}


def edge_mask(out_w: int, out_h: int) -> np.ndarray:
    """
    Fades the plate to the background colour at all four edges.

    The plates carry a soft pool of light under the car that the frame simply
    cuts off. Wherever the canvas letterboxes — most of the time on a phone —
    that cut lands mid-gradient and shows up as a horizontal seam against the
    page. Feathering the edges makes every boundary of the frame identical to
    the page background, so the canvas has no visible edges at any viewport.
    """
    xs = np.linspace(0.0, 1.0, out_w, dtype=np.float32)[None, :]
    ys = np.linspace(0.0, 1.0, out_h, dtype=np.float32)[:, None]

    def ramp(t: np.ndarray, width: float) -> np.ndarray:
        v = np.clip(t / width, 0.0, 1.0)
        return v * v * (3.0 - 2.0 * v)  # smoothstep, so there is no hard knee

    mask = (
        ramp(ys, FEATHER["top"])
        * ramp(1.0 - ys, FEATHER["bottom"])
        * ramp(xs, FEATHER["side"])
        * ramp(1.0 - xs, FEATHER["side"])
    )
    return mask.astype(np.float32)


def build_ramps(out_w: int, out_h: int):
    """Static coordinate grids reused by every frame."""
    xs = np.linspace(0.0, 1.0, out_w, dtype=np.float32)[None, :]
    ys = np.linspace(0.0, 1.0, out_h, dtype=np.float32)[:, None]
    return xs, ys


def render_frame(plates: list[Plate], i: int, out_w: int, out_h: int,
                 xs: np.ndarray, ys: np.ndarray, edges: np.ndarray) -> Image.Image:
    p = i / (FRAMES - 1)

    # --- camera: a single slow forward dolly across the whole timeline -------
    # The car holds still for the first beat, then creeps and builds speed.
    move = 0.0 if p < 0.12 else ease_in_out(min(1.0, (p - 0.12) / 0.88))
    car_w_frac = 0.545 + 0.235 * move                # 54.5% -> 78% of frame width
    cx_frac = 0.500 - 0.038 * move                   # drifts left as it turns in
    cy_frac = 0.520 + 0.020 * move                   # settles lower in frame

    # --- plate selection + light-dip crossover ------------------------------
    idx, blend = 0, 0.0
    for n, (centre, half) in enumerate(SWITCHES):
        if p >= centre + half:
            idx = n + 1
        elif p > centre - half:
            idx = n
            blend = (p - (centre - half)) / (2 * half)
    dip = 0.0
    if blend > 0.0:
        # A single smooth dip to darkness and back, peaking mid-crossover.
        dip = math.sin(blend * math.pi) ** 1.35

    frame = sample_plate(plates[idx if blend < 0.5 else idx + 1],
                         out_w, out_h, car_w_frac, cx_frac, cy_frac)
    arr = np.asarray(frame).astype(np.float32)

    # --- studio key light travelling along the bodywork ---------------------
    # Masked by the plate's own luminance so it lifts existing speculars
    # instead of painting light onto the black void.
    luma = arr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    body = np.clip((luma - 10.0) / 70.0, 0.0, 1.0)

    sweep_pos = -0.35 + 1.7 * ease_in_out(p)
    band = np.exp(-(((xs - 0.30 * ys) - sweep_pos) ** 2) / (2 * 0.052 ** 2))
    spec = (band * body * 52.0)[:, :, None]
    arr = arr + spec * np.array([1.00, 1.02, 1.10], dtype=np.float32)

    # --- headlights coming up to a refined intensity ------------------------
    lights = ease_out(np.clip((p - 0.04) / 0.30, 0.0, 1.0))
    hot = np.clip((luma - 168.0) / 87.0, 0.0, 1.0)[:, :, None]
    arr = arr + hot * (26.0 + 34.0 * lights) * np.array([0.94, 0.97, 1.00],
                                                        dtype=np.float32)

    # --- overall exposure: breathe up, then dip through each plate change ---
    exposure = 1.09 * (1.0 + 0.05 * move) * (1.0 - 0.60 * dip)
    arr = arr * exposure

    # --- seat everything on exact #060606, edges feathered ------------------
    bg = np.array(BG, dtype=np.float32)
    arr = bg + np.clip(arr - bg, 0.0, None) * edges[:, :, None]
    return Image.fromarray(np.clip(arr, 0.0, 255.0).astype(np.uint8))


def main() -> None:
    src = sys.argv[1]
    dst = sys.argv[2]
    plates = [Plate(os.path.join(src, name)) for name in PLATES]

    manifest = {"frames": FRAMES, "sets": {}}
    for name, out_w, out_h, quality in OUTPUT_SETS:
        out_dir = os.path.join(dst, name)
        os.makedirs(out_dir, exist_ok=True)
        xs, ys = build_ramps(out_w, out_h)
        edges = edge_mask(out_w, out_h)
        for i in range(FRAMES):
            img = render_frame(plates, i, out_w, out_h, xs, ys, edges)
            img.save(os.path.join(out_dir, f"frame_{i:04d}.jpg"),
                     quality=quality, optimize=True, progressive=True)
        total = sum(
            os.path.getsize(os.path.join(out_dir, f)) for f in os.listdir(out_dir)
        )
        manifest["sets"][name] = {"width": out_w, "height": out_h}
        print(f"{name}: {FRAMES} frames, {total / 1024 / 1024:.2f} MB")

    with open(os.path.join(dst, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)


if __name__ == "__main__":
    main()
