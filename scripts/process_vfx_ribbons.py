#!/usr/bin/env python3
"""
Slice a 12-row horizontal ribbon VFX sheet on white background into 12 seamless
1024x128 RGBA PNG textures:
  public/assets/vfx_ribbons/ribbon_01.png .. ribbon_12.png

Uses Color-to-Alpha / Unmultiply White (100% transparent RGBA, zero black/white fringe)
and gentle horizontal wrap-blend at the left/right edges for seamless UV scrolling.
"""

from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter


def blur_2d(arr: np.ndarray, radius: float) -> np.ndarray:
    u8 = np.clip(np.round(arr * 255.0), 0, 255).astype(np.uint8)
    blurred = Image.fromarray(u8, mode="L").filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(blurred, dtype=np.float32) / 255.0


def unmultiply_ribbon(strip_rgb: np.ndarray, ribbon_id: int) -> np.ndarray:
    rgb = strip_rgb.astype(np.float32) / 255.0
    h, w, _ = rgb.shape

    raw_alpha = 1.0 - np.min(rgb, axis=-1)
    floor = 0.012
    alpha = np.clip((raw_alpha - floor) / (1.0 - floor), 0.0, 1.0)

    # Boost pale ribbons slightly for bright daylight map visibility
    if ribbon_id in (1, 12):
        alpha = np.power(alpha, 0.65)
        alpha = np.clip(alpha * 1.28, 0.0, 1.0)
    elif ribbon_id in (2, 3, 4, 10, 11):
        alpha = np.power(alpha, 0.74)
        alpha = np.clip(alpha * 1.15, 0.0, 1.0)
    else:
        alpha = np.power(alpha, 0.84)

    # Unmultiply white
    a_exp = alpha[..., None]
    rgb_unmult = np.clip((rgb - (1.0 - a_exp)) / np.maximum(a_exp, 1e-5), 0.0, 1.0)

    # Restore incandescent white-hot cores inside lightning / stars / rainbow glow
    tight = blur_2d(alpha, radius=3.5)
    luma = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    core_mask = np.clip((tight - 0.30) / 0.35, 0.0, 1.0)
    core_heat = np.clip(core_mask * np.clip((luma - 0.78) / 0.22, 0.0, 1.0) * (1.0 - alpha) * 1.35, 0.0, 1.0)

    alpha = np.clip(alpha + core_heat, 0.0, 1.0)
    core_exp = core_heat[..., None]
    rgb_out = np.clip(rgb_unmult * (1.0 - core_exp * 0.72) + core_exp * 1.0, 0.0, 1.0)

    # Soft vertical edge fade (top & bottom 4%) so there's never any horizontal clipping
    v_fade = max(3, int(round(h * 0.04)))
    ramp = np.linspace(0.0, 1.0, v_fade, dtype=np.float32)
    alpha[:v_fade, :] *= ramp[:, None]
    alpha[-v_fade:, :] *= ramp[::-1, None]

    # Seamless horizontal crossfade on 4% wrap margin so UV scrolling loops invisibly
    blend_w = max(8, int(round(w * 0.04)))
    t = np.linspace(0.0, 1.0, blend_w, dtype=np.float32)[None, :, None]
    rgba = np.concatenate([rgb_out, alpha[..., None]], axis=-1)
    # Crossfade left edge with right edge
    left_orig = rgba[:, :blend_w, :].copy()
    right_orig = rgba[:, -blend_w:, :].copy()
    rgba[:, :blend_w, :] = right_orig * (1.0 - t) + left_orig * t
    rgba[:, -blend_w:, :] = right_orig * (1.0 - t) + left_orig * t

    # Zero RGB where alpha is effectively 0
    rgba[..., :3] = np.where(rgba[..., 3:4] > 1e-4, rgba[..., :3], 0.0)
    return np.clip(np.round(rgba * 255.0), 0, 255).astype(np.uint8)


def process_ribbons(src_path: Path, out_dir: Path, preview_path: Path | None = None) -> None:
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    print(f"Loaded {src_path} ({w}x{h})")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Equal 12-row vertical division (verify row centers cleanly)
    num_rows = 12
    target_w, target_h = 1024, 128

    preview_sheet = Image.new("RGBA", (target_w // 2, (target_h // 2) * num_rows), (216, 188, 140, 255))

    for i in range(num_rows):
        y0 = round(i * h / num_rows)
        y1 = round((i + 1) * h / num_rows)
        strip = img.crop((0, y0, w, y1)).resize((target_w, target_h), Image.Resampling.LANCZOS)
        rgba_u8 = unmultiply_ribbon(np.asarray(strip), ribbon_id=i + 1)
        out_img = Image.fromarray(rgba_u8, mode="RGBA")
        name = f"ribbon_{i + 1:02d}.png"
        out_img.save(out_dir / name, optimize=True)

        thumb = out_img.resize((target_w // 2, target_h // 2), Image.Resampling.LANCZOS)
        preview_sheet.alpha_composite(thumb, dest=(0, i * (target_h // 2)))
        print(f"  [{i + 1:02d}/12] Saved {name} (max_alpha={rgba_u8[..., 3].max()})")

    if preview_path is not None:
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview_sheet.convert("RGB").save(preview_path, optimize=True)
        print(f"Saved daylight verification sheet to {preview_path}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/hieuungxq.png")
    out = repo_root / "public" / "assets" / "vfx_ribbons"
    preview = Path(
        "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
        "e1748774-feea-4c04-b037-5491d0414e3e/scratch/vfx_ribbons_daylight_preview.png"
    )
    process_ribbons(src, out, preview_path=preview)
