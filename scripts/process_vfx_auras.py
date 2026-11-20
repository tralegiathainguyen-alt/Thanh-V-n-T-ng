#!/usr/bin/env python3
"""
Process a 4x4 vertical body aura VFX sprite sheet on white background into:
  public/assets/vfx_auras/aura_01.png .. aura_16.png (512x512 RGBA transparent PNGs)

Features:
- Color-to-Alpha / Unmultiply White (alpha = 1 - min(R,G,B)) with zero white/black fringe.
- Preserves rich dark saturation on dark auras (aura_10 cosmos, aura_11 crimson).
- Gently boosts alpha contrast on pale auras (aura_01 white mist, aura_02, aura_14, aura_15)
  so they stay clearly visible on bright daylight maps.
- Applies a smooth 15% top-edge alpha fade gradient on aura_16 to eliminate top-edge clipping.
"""

from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter


def blur_2d(arr: np.ndarray, radius: float) -> np.ndarray:
    u8 = np.clip(np.round(arr * 255.0), 0, 255).astype(np.uint8)
    blurred = Image.fromarray(u8, mode="L").filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(blurred, dtype=np.float32) / 255.0


def unmultiply_aura(tile_rgb: np.ndarray, aura_id: int) -> np.ndarray:
    rgb = tile_rgb.astype(np.float32) / 255.0
    h, w, _ = rgb.shape

    # 1. Color-to-Alpha: deviation from pure white
    raw_alpha = 1.0 - np.min(rgb, axis=-1)

    # Clean tiny pure-white compression noise
    floor = 0.012
    alpha = np.clip((raw_alpha - floor) / (1.0 - floor), 0.0, 1.0)

    # 2. Per-aura alpha contrast tuning:
    # - aura_01 (pale white/grey smoke): boost alpha contrast so it pops on daylight map
    # - aura_14 (bright golden lightning) & aura_15 (pastel rainbow): slight alpha lift
    # - aura_10 (dark cosmos) & aura_11 (deep crimson): keep crisp & saturated
    if aura_id == 1:
        alpha = np.power(alpha, 0.58)
        alpha = np.clip(alpha * 1.35, 0.0, 1.0)
    elif aura_id in (2, 5, 14, 15):
        alpha = np.power(alpha, 0.72)
        alpha = np.clip(alpha * 1.15, 0.0, 1.0)
    elif aura_id in (10, 11):
        alpha = np.power(alpha, 0.88)
    else:
        alpha = np.power(alpha, 0.80)

    # 3. Unmultiply white background to restore pure, vivid color without white halo
    a_exp = alpha[..., None]
    rgb_unmult = np.clip((rgb - (1.0 - a_exp)) / np.maximum(a_exp, 1e-5), 0.0, 1.0)

    # 4. Preserve tiny bright starlight/lightning cores enclosed inside colored strokes
    tight_surround = blur_2d(alpha, radius=4.0)
    luma = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    core_mask = np.clip((tight_surround - 0.32) / 0.35, 0.0, 1.0)
    core_heat = core_mask * np.clip((luma - 0.80) / 0.20, 0.0, 1.0) * (1.0 - alpha)
    core_heat = np.clip(core_heat * 1.2, 0.0, 1.0)

    alpha = np.clip(alpha + core_heat, 0.0, 1.0)
    core_exp = core_heat[..., None]
    rgb_out = np.clip(rgb_unmult * (1.0 - core_exp * 0.7) + core_exp * 1.0, 0.0, 1.0)

    # For pale silver/white mist (aura_01), tint subtly icy-jade-white so it reads gracefully on warm daylight map
    if aura_id == 1:
        rgb_out = np.clip(rgb_out * np.array([0.86, 0.94, 0.98], dtype=np.float32), 0.0, 1.0)

    # 5. Soft edge guard on outer 2% border to prevent any neighbor-cell bleed
    edge_px = max(2, int(round(w * 0.015)))
    edge_mask = np.ones((h, w), dtype=np.float32)
    ramp = np.linspace(0.0, 1.0, edge_px, dtype=np.float32)
    edge_mask[:edge_px, :] *= ramp[:, None]
    edge_mask[-edge_px:, :] *= ramp[::-1, None]
    edge_mask[:, :edge_px] *= ramp[None, :]
    edge_mask[:, -edge_px:] *= ramp[None, ::-1]
    alpha *= edge_mask

    # 6. Special 15% top-edge smooth alpha fade gradient for aura_16 (touching top border)
    if aura_id == 16:
        fade_rows = int(round(h * 0.15))
        t = np.linspace(0.0, 1.0, fade_rows, dtype=np.float32)
        smooth_t = t * t * (3.0 - 2.0 * t)
        alpha[:fade_rows, :] *= smooth_t[:, None]

    # Zero out RGB where alpha is effectively zero
    a_final = alpha[..., None]
    rgb_out = np.where(a_final > 1e-4, rgb_out, 0.0)

    rgba = np.concatenate([rgb_out, a_final], axis=-1)
    return np.clip(np.round(rgba * 255.0), 0, 255).astype(np.uint8)


def process_aura_grid(src_path: Path, out_dir: Path, tile_size: int = 512, preview_path: Path | None = None) -> None:
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    print(f"Loaded {src_path} ({w}x{h})")
    out_dir.mkdir(parents=True, exist_ok=True)

    # Preview sheet on warm daytime sect-map stone/sand background (#D8BC8C) to verify daylight visibility!
    half = tile_size // 2
    preview_sheet = Image.new("RGBA", (half * 4, half * 4), (216, 188, 140, 255))

    idx = 1
    for row in range(4):
        for col in range(4):
            x0 = round(col * w / 4)
            y0 = round(row * h / 4)
            x1 = round((col + 1) * w / 4)
            y1 = round((row + 1) * h / 4)

            cell = img.crop((x0, y0, x1, y1))
            if cell.size != (tile_size, tile_size):
                cell = cell.resize((tile_size, tile_size), Image.Resampling.LANCZOS)

            rgba_u8 = unmultiply_aura(np.asarray(cell), aura_id=idx)
            name = f"aura_{idx:02d}.png"
            out_img = Image.fromarray(rgba_u8, mode="RGBA")
            out_img.save(out_dir / name, optimize=True)

            thumb = out_img.resize((half, half), Image.Resampling.LANCZOS)
            preview_sheet.alpha_composite(thumb, dest=(col * half, row * half))

            print(
                f"  [{idx:02d}/16] Saved {name} (max_alpha={rgba_u8[..., 3].max()}, "
                f"top_row_max={rgba_u8[0, :, 3].max()})"
            )
            idx += 1

    if preview_path is not None:
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview_sheet.convert("RGB").save(preview_path, optimize=True)
        print(f"Saved daylight-map verification sheet to {preview_path}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/hieuungxq.png")
    out = repo_root / "public" / "assets" / "vfx_auras"
    preview = Path(
        "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
        "e1748774-feea-4c04-b037-5491d0414e3e/scratch/vfx_auras_daylight_preview.png"
    )
    process_aura_grid(src, out, tile_size=512, preview_path=preview)
