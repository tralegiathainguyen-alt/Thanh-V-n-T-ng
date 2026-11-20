#!/usr/bin/env python3
"""
Process a 4x4 surrounding body-aura VFX sprite sheet on white background into:
1. public/assets/vfx_auras/transparent/aura_01.png .. aura_16.png (RGBA transparent)
2. public/assets/vfx_auras/additive/aura_01.png .. aura_16.png (RGB on pure black for Additive Blending)

Uses Color-to-Alpha / Unmultiply White + incandescent core preservation + soft border feather
so swirling body auras have zero white fringe and zero hard square edges.
"""

from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter


def build_edge_feather_mask(size: int, margin_frac: float = 0.04) -> np.ndarray:
    """Smooth feather on all 4 borders so aura ribbons never show a hard rectangular cutoff."""
    coords = np.linspace(0.0, 1.0, size, dtype=np.float32)
    edge_dist = np.minimum(coords, 1.0 - coords)
    t = np.clip(edge_dist / max(margin_frac, 1e-6), 0.0, 1.0)
    ramp = t * t * (3.0 - 2.0 * t)
    return np.outer(ramp, ramp)


def blur_2d(arr: np.ndarray, radius: float) -> np.ndarray:
    u8 = np.clip(np.round(arr * 255.0), 0, 255).astype(np.uint8)
    blurred = Image.fromarray(u8, mode="L").filter(ImageFilter.GaussianBlur(radius=radius))
    return np.asarray(blurred, dtype=np.float32) / 255.0


def unmultiply_white_aura(tile_rgb: np.ndarray, edge_mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    rgb = tile_rgb.astype(np.float32) / 255.0

    # 1. Color-to-Alpha from deviation from pure white
    raw_alpha = 1.0 - np.min(rgb, axis=-1)

    # Remove tiny compression noise (< 1.2%) and boost delicate wisps smoothly
    floor = 0.012
    base_alpha = np.clip((raw_alpha - floor) / (1.0 - floor), 0.0, 1.0)
    base_alpha = np.power(base_alpha, 0.78)

    # 2. Unmultiply white background to recover vivid ribbon colors
    a_exp = base_alpha[..., None]
    rgb_unmult = np.clip((rgb - (1.0 - a_exp)) / np.maximum(a_exp, 1e-5), 0.0, 1.0)

    # 3. Preserve enclosed white-hot cores (lightning centers, bright ribbon highlights, sparks)
    tight_surround = blur_2d(base_alpha, radius=4.0)
    mid_surround = blur_2d(base_alpha, radius=10.0)
    luma = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    core_mask = np.clip((tight_surround - 0.24) / 0.32, 0.0, 1.0) * np.clip((mid_surround - 0.15) / 0.32, 0.0, 1.0)
    core_heat = core_mask * np.clip((luma - 0.72) / 0.28, 0.0, 1.0) * (1.0 - base_alpha)
    core_heat = np.clip(core_heat * 1.4, 0.0, 1.0)

    alpha = np.clip(base_alpha + core_heat, 0.0, 1.0)
    alpha = np.clip(alpha * edge_mask, 0.0, 1.0)

    core_exp = core_heat[..., None]
    rgb_out = np.clip(rgb_unmult * (1.0 - core_exp * 0.72) + core_exp * 1.0, 0.0, 1.0)

    # For very pale silver/white wisps (like aura_01), lift RGB slightly so they glow cleanly on dark & light maps
    a_final = alpha[..., None]
    rgb_out = np.where(a_final > 1e-4, rgb_out, 0.0)

    rgba = np.concatenate([rgb_out, a_final], axis=-1)
    rgba_u8 = np.clip(np.round(rgba * 255.0), 0, 255).astype(np.uint8)

    additive = np.clip(rgb_out * a_final, 0.0, 1.0)
    additive = np.clip(np.power(additive, 0.88) * 1.15, 0.0, 1.0) * edge_mask[..., None]
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

    edge_mask = build_edge_feather_mask(tile_size, margin_frac=0.04)
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

            rgba_u8, add_u8 = unmultiply_white_aura(np.asarray(cell), edge_mask)

            name = f"aura_{idx:02d}.png"
            Image.fromarray(rgba_u8, mode="RGBA").save(trans_dir / name, optimize=True)
            Image.fromarray(add_u8, mode="RGB").save(add_dir / name, optimize=True)

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
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/hieuungxq.png")
    out = repo_root / "public" / "assets" / "vfx_auras"
    preview = Path(
        "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/"
        "e1748774-feea-4c04-b037-5491d0414e3e/scratch/vfx_auras_preview.png"
    )
    process_grid(src, out, tile_size=512, preview_path=preview)
