#!/usr/bin/env python3
"""
Process a 4x4 magic ring VFX sprite sheet on white background into:
1. public/assets/vfx_rings/transparent/ring_01.png .. ring_16.png (RGBA transparent)
2. public/assets/vfx_rings/additive/ring_01.png .. ring_16.png (RGB premultiplied on pure black for Additive Blending)

Uses Color-to-Alpha / Unmultiply White (no hard threshold) + smooth outer radial mask
so rotating rings never show white fringes or square edges.
"""

from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter


def build_radial_mask(size: int, inner_r: float = 0.92, outer_r: float = 1.0) -> np.ndarray:
    """Create a smoothstep radial mask that is 1.0 inside inner_r and fades to 0.0 at outer_r."""
    coords = np.linspace(-1.0, 1.0, size, dtype=np.float32)
    yy, xx = np.meshgrid(coords, coords, indexing="ij")
    rr = np.sqrt(xx * xx + yy * yy)
    t = np.clip((rr - inner_r) / max(outer_r - inner_r, 1e-6), 0.0, 1.0)
    # Smoothstep falloff: 1 - (3t^2 - 2t^3)
    return 1.0 - (t * t * (3.0 - 2.0 * t))


def blur_2d(arr: np.ndarray, radius: float) -> np.ndarray:
    """Fast Gaussian blur on a [0,1] float32 2D array using Pillow."""
    u8 = np.clip(np.round(arr * 255.0), 0, 255).astype(np.uint8)
    blurred = Image.fromarray(u8, mode="L").filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(blurred, dtype=np.float32) / 255.0


def unmultiply_white(tile_rgb: np.ndarray, radial_mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Color-to-Alpha for white background with incandescent core preservation:
      alpha = 1.0 - min(R, G, B)
      smooth noise-floor + gamma curve to eliminate pure white while preserving soft glow
      RGB_out = (RGB_in - (1 - alpha)) / max(alpha, 1e-5)
      + enclosed white-hot core recovery so lightning bolts & star dots shine bright white
        instead of turning hollow dark.
    Returns (rgba_uint8, additive_rgb_uint8).
    """
    rgb = tile_rgb.astype(np.float32) / 255.0

    # 1. Color-to-Alpha from deviation from pure white
    raw_alpha = 1.0 - np.min(rgb, axis=-1)

    # Remove tiny compression noise (< 1.2%) and apply smooth glow curve
    floor = 0.012
    base_alpha = np.clip((raw_alpha - floor) / (1.0 - floor), 0.0, 1.0)
    base_alpha = np.power(base_alpha, 0.82)

    # 2. Unmultiply white background to recover vivid base color
    a_exp = base_alpha[..., None]
    rgb_unmult = np.clip((rgb - (1.0 - a_exp)) / np.maximum(a_exp, 1e-5), 0.0, 1.0)

    # 3. Detect enclosed white-hot cores (e.g. lightning centers, star dots, bright sparks)
    # Only pixels tightly surrounded by strong colored glow (small-radius blur of base_alpha)
    # AND very bright in the original image get their incandescent core restored.
    tight_surround = blur_2d(base_alpha, radius=5.0)
    mid_surround = blur_2d(base_alpha, radius=12.0)
    luma = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    # Core is bright (>0.82) where base_alpha dropped locally, yet tight neighborhood has strong color
    core_mask = np.clip((tight_surround - 0.28) / 0.35, 0.0, 1.0) * np.clip((mid_surround - 0.18) / 0.35, 0.0, 1.0)
    core_heat = core_mask * np.clip((luma - 0.72) / 0.28, 0.0, 1.0) * (1.0 - base_alpha)
    core_heat = np.clip(core_heat * 1.45, 0.0, 1.0)

    # Combine alpha and blend white-hot core into unmultiplied RGB
    alpha = np.clip(base_alpha + core_heat, 0.0, 1.0)
    alpha = np.clip(alpha * radial_mask, 0.0, 1.0)

    # Tint the white-hot core softly toward warm/bright incandescent white
    core_exp = core_heat[..., None]
    rgb_out = np.clip(rgb_unmult * (1.0 - core_exp * 0.75) + core_exp * 1.0, 0.0, 1.0)

    # Zero out RGB where alpha is effectively zero
    a_final = alpha[..., None]
    rgb_out = np.where(a_final > 1e-4, rgb_out, 0.0)

    # Transparent RGBA output
    rgba = np.concatenate([rgb_out, a_final], axis=-1)
    rgba_u8 = np.clip(np.round(rgba * 255.0), 0, 255).astype(np.uint8)

    # Additive RGB output on pure black (RGB * alpha) with gentle HDR-ready radiance lift
    additive = np.clip(rgb_out * a_final, 0.0, 1.0)
    # Slight luminous lift on midtones so runes & misty rings read crisply in additive blending
    additive = np.clip(np.power(additive, 0.90) * 1.12, 0.0, 1.0) * radial_mask[..., None]
    additive_u8 = np.clip(np.round(additive * 255.0), 0, 255).astype(np.uint8)

    return rgba_u8, additive_u8


def process_grid(src_path: Path, out_root: Path, tile_size: int = 512, preview_path: Path | None = None) -> None:
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    print(f"Loaded {src_path} ({w}x{h})")

    trans_dir = out_root / "transparent"
    add_dir = out_root / "additive"
    trans_dir.mkdir(parents=True, exist_ok=True)
    add_dir.mkdir(parents=True, exist_ok=True)

    radial_mask = build_radial_mask(tile_size, inner_r=0.92, outer_r=1.0)

    # Contact sheet preview on dark floor background (#0A1215)
    preview_sheet = Image.new("RGB", (tile_size * 4 // 2, tile_size * 4 // 2), (10, 18, 21))

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

            rgba_u8, add_u8 = unmultiply_white(np.asarray(cell), radial_mask)

            name = f"ring_{idx:02d}.png"
            Image.fromarray(rgba_u8, mode="RGBA").save(trans_dir / name, optimize=True)
            Image.fromarray(add_u8, mode="RGB").save(add_dir / name, optimize=True)

            # Composite additive tile onto dark contact sheet for visual verification
            half = tile_size // 2
            add_thumb = Image.fromarray(add_u8, mode="RGB").resize((half, half), Image.Resampling.LANCZOS)
            bg_patch = np.asarray(
                preview_sheet.crop((col * half, row * half, (col + 1) * half, (row + 1) * half)),
                dtype=np.int16,
            )
            comp = np.clip(bg_patch + np.asarray(add_thumb, dtype=np.int16), 0, 255).astype(np.uint8)
            preview_sheet.paste(Image.fromarray(comp, mode="RGB"), (col * half, row * half))

            print(f"  [{idx:02d}/16] Saved {name} (max_alpha={rgba_u8[..., 3].max()}, edge_max={rgba_u8[0, :, 3].max()})")
            idx += 1

    if preview_path is not None:
        preview_path.parent.mkdir(parents=True, exist_ok=True)
        preview_sheet.save(preview_path, optimize=True)
        print(f"Saved dark-background verification sheet to {preview_path}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/hieuung.png")
    out = repo_root / "public" / "assets" / "vfx_rings"
    preview = Path(
        "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
        "e1748774-feea-4c04-b037-5491d0414e3e/scratch/vfx_rings_preview.png"
    )
    process_grid(src, out, tile_size=512, preview_path=preview)
