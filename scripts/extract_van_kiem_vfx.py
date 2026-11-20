#!/usr/bin/env python3
"""
Extract and de-black golden sword-qi VFX sprites from skil1.png into
public/assets/vfx_skills/van_kiem/*.png with clean RGBA transparency.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image


def deblack_to_rgba(img_rgb: Image.Image) -> Image.Image:
    """Convert black-background additive VFX image to clean RGBA."""
    arr = np.asarray(img_rgb.convert("RGB"), dtype=np.float32)
    alpha = arr.max(axis=2) / 255.0
    alpha = np.where(alpha < 0.04, 0.0, alpha)

    denom = np.maximum(alpha, 0.15)[..., None]
    rgb_out = np.clip(arr / denom, 0.0, 255.0)
    rgb_out = np.where(alpha[..., None] <= 0.0, 0.0, rgb_out)

    rgba = np.dstack([rgb_out, np.clip(alpha * 255.0, 0.0, 255.0)]).astype(np.uint8)
    return Image.fromarray(rgba, mode="RGBA")


def crop_and_trim(
    src: Image.Image,
    box: tuple[int, int, int, int],
    *,
    pad: int = 4,
    make_square: bool = False,
) -> Image.Image:
    cropped = src.crop(box)
    rgba = deblack_to_rgba(cropped)
    alpha = np.asarray(rgba)[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0 or len(ys) == 0:
        return rgba

    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(rgba.width, int(xs.max()) + pad + 1)
    y1 = min(rgba.height, int(ys.max()) + pad + 1)
    tight = rgba.crop((x0, y0, x1, y1))

    if not make_square:
        return tight

    side = max(tight.width, tight.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(tight, ((side - tight.width) // 2, (side - tight.height) // 2))
    return canvas


def main() -> None:
    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/skil1.png")
    out_dir = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path(__file__).resolve().parent.parent / "public" / "assets" / "vfx_skills" / "van_kiem"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(src_path).convert("RGB")
    assert src.size == (1024, 1024), f"Expected 1024x1024, got {src.size}"

    # 1. Cluster 1: Top-left Bagua formation circle (square tight crop, keep clear of x>=508)
    circle = crop_and_trim(src, (0, 0, 508, 508), pad=2, make_square=True)
    circle.save(out_dir / "circle.png")

    # 2. Cluster 2: Top-right horizontal sword streaks
    # Note: 3 primary streaks matching streak_01..streak_03 (and clean vertical valleys)
    streak_boxes = [
        ("streak_01.png", (512, 14, 1024, 52)),
        ("streak_02.png", (512, 52, 1024, 92)),
        ("streak_03.png", (512, 92, 1024, 154)),
    ]
    for name, box in streak_boxes:
        im = crop_and_trim(src, box, pad=2, make_square=False)
        arr = np.asarray(im, dtype=np.float32).copy()
        h, w = arr.shape[:2]
        fx = np.minimum(np.arange(w), np.arange(w - 1, -1, -1))
        fy = np.minimum(np.arange(h), np.arange(h - 1, -1, -1))
        fade_x = np.clip(fx / 8.0, 0.0, 1.0)[None, :]
        fade_y = np.clip(fy / 4.0, 0.0, 1.0)[:, None]
        arr[:, :, 3] = np.where(arr[:, :, 3] * fade_x * fade_y < 10.0, 0.0, arr[:, :, 3] * fade_x * fade_y)
        Image.fromarray(arr.astype(np.uint8), mode="RGBA").save(out_dir / name)

    # 3. Cluster 3: Mid-right 2x3 particle grid (grid lines at x=682, x=853, y=341)
    # Inset 8px from every cell edge to eliminate all faint gray grid lines
    inset = 8
    cols = [(512, 682), (682, 853), (853, 1024)]
    rows = [(170, 341), (341, 512)]
    particle_names = [
        ["p_sparkles.png", "p_shards.png", "p_star4.png"],
        ["p_star8.png", "p_dust.png", "p_orb.png"],
    ]
    for r_idx, (y0, y1) in enumerate(rows):
        for c_idx, (x0, x1) in enumerate(cols):
            box = (x0 + inset, y0 + inset, x1 - inset, y1 - inset)
            crop_and_trim(src, box, pad=4, make_square=True).save(
                out_dir / particle_names[r_idx][c_idx]
            )

    # 4. Cluster 4: Lower half impact frames (impact_01 .. impact_13), excluding bottom-right watermark
    impact_boxes = [
        # Row 0 (y: 516..676)
        (0, 516, 165, 676),      # impact_01
        (165, 516, 345, 676),    # impact_02
        (345, 516, 512, 676),    # impact_03
        (512, 516, 686, 676),    # impact_04
        (686, 516, 854, 676),    # impact_05
        (854, 516, 1024, 676),   # impact_06
        # Row 1 (y: 676..856)
        (0, 676, 168, 848),      # impact_07
        (168, 676, 319, 848),    # impact_08
        (319, 676, 514, 856),    # impact_09
        (514, 676, 708, 848),    # impact_10
        (788, 676, 1024, 848),   # impact_11
        # Row 2 (y: 856..1024) — STOP before watermark at x > 840
        (0, 848, 250, 1024),     # impact_12
        (320, 862, 512, 1024),   # impact_13
    ]
    # Normalize all impact frames to a common square canvas size for flicker-free playback
    raw_impacts = [crop_and_trim(src, box, pad=4, make_square=True) for box in impact_boxes]
    max_side = max(im.width for im in raw_impacts)
    for idx, im in enumerate(raw_impacts, start=1):
        canvas = Image.new("RGBA", (max_side, max_side), (0, 0, 0, 0))
        canvas.paste(im, ((max_side - im.width) // 2, (max_side - im.height) // 2))
        canvas.save(out_dir / f"impact_{idx:02d}.png")

    print(f"Extracted {1 + len(streak_boxes) + 6 + len(impact_boxes)} PNGs to {out_dir}")


if __name__ == "__main__":
    main()
