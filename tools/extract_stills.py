"""
Cuts the fixed editorial stills out of the studio plates:

  public/detail/*.jpg   the full-bleed macro photography band
  public/hero-static.jpg the reduced-motion hero
  public/og.jpg          social card

Every still is seated on exact #060606 so it butts against the page
background without an edge.
"""
from __future__ import annotations

import os
import sys

import numpy as np
from PIL import Image, ImageFilter

from render_sequence import edge_mask

BG = (6, 6, 6)

# name -> (plate, centre_x, centre_y, crop_width, aspect w:h)
DETAILS = {
    "grille":    ("plate_c.jpg",  530, 620, 380, (4, 5)),
    "headlight": ("plate_b.jpg",  640, 520, 360, (4, 5)),
    "carbon":    ("plate_b.jpg",  660, 730, 360, (4, 5)),
    "wheel":     ("plate_b.jpg",  900, 660, 340, (4, 5)),
    "cline":     ("plate_c.jpg", 1240, 590, 400, (4, 5)),
    "intake":    ("plate_c.jpg", 1080, 620, 380, (4, 5)),
    "haunch":    ("plate_c.jpg", 1560, 570, 380, (4, 5)),
    "canopy":    ("plate_b.jpg", 1000, 470, 380, (4, 5)),
}

DETAIL_WIDTH = 900


def seat_on_bg(img: Image.Image) -> Image.Image:
    arr = np.asarray(img).astype(np.float32)
    bg = np.array(BG, dtype=np.float32)
    arr = bg + np.clip(arr - bg, 0.0, None)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def crop_box(plate: Image.Image, cx: int, cy: int, w: int,
             aspect: tuple[int, int]) -> tuple[int, int, int, int]:
    h = int(round(w * aspect[1] / aspect[0]))
    x0 = max(0, min(plate.width - w, cx - w // 2))
    y0 = max(0, min(plate.height - h, cy - h // 2))
    return x0, y0, x0 + w, y0 + h


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(dst, "detail"), exist_ok=True)

    plates = {
        name: Image.open(os.path.join(src, name)).convert("RGB")
        for name in {v[0] for v in DETAILS.values()} | {"plate_b.jpg"}
    }

    for name, (plate_name, cx, cy, w, aspect) in DETAILS.items():
        plate = plates[plate_name]
        crop = plate.crop(crop_box(plate, cx, cy, w, aspect))
        out_h = int(round(DETAIL_WIDTH * aspect[1] / aspect[0]))
        img = crop.resize((DETAIL_WIDTH, out_h), Image.LANCZOS)
        # Upscaled plates go slightly soft; a light unsharp restores the
        # specular edges without introducing halos on the black.
        img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70,
                                                 threshold=4))
        path = os.path.join(dst, "detail", f"{name}.jpg")
        seat_on_bg(img).save(path, quality=84, optimize=True, progressive=True)
        print(f"detail/{name}.jpg  {DETAIL_WIDTH}x{out_h}")

    # Reduced-motion hero and social card, both from the hero plate.
    hero = plates["plate_b.jpg"]
    resized = np.asarray(hero.resize((1800, 1013), Image.LANCZOS)).astype(np.float32)
    bg = np.array(BG, dtype=np.float32)
    feathered = bg + np.clip(resized - bg, 0.0, None) * edge_mask(1800, 1013)[:, :, None]
    static = Image.fromarray(np.clip(feathered, 0, 255).astype(np.uint8))
    static.save(os.path.join(dst, "hero-static.jpg"), quality=84,
                optimize=True, progressive=True)
    print("hero-static.jpg 1800x1013")

    og = hero.crop((100, 130, 1948, 1100)).resize((1200, 630), Image.LANCZOS)
    seat_on_bg(og).save(os.path.join(dst, "og.jpg"), quality=86, optimize=True)
    print("og.jpg 1200x630")


if __name__ == "__main__":
    main()
