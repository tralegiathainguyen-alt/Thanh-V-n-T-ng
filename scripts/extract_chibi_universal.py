#!/usr/bin/env python3
"""
Extract high-resolution (512x640 RGBA PNG) modular Chibi Paper Doll assets:
  - Universal Headless Chibi Poses (idle, run_1, run_2, attack) -> public/assets/paper_doll/common/
  - Female Modular Parts (hairs, faces, 4 outfits)             -> public/assets/paper_doll/female/
  - Re-aligned High-Res Male Parts                             -> public/assets/paper_doll/male/
All parts share the exact same 512x640 coordinate space (bottom-center anchored)
so any gender's face, hair, outfit, pose, and weapon snap together seamlessly.
"""
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image


CANVAS_W, CANVAS_H = 512, 640
HEAD_CX, HEAD_CY = 260, 184  # canonical head center on 512x640 canvas


def remove_outer_white(crop_rgba: Image.Image, thresh: int = 238) -> Image.Image:
    """Flood-fill remove ONLY outer white background, preserving white clothes & eye whites."""
    arr = np.asarray(crop_rgba.convert("RGBA"), dtype=np.uint8).copy()
    h, w = arr.shape[:2]
    is_white = (arr[:, :, 0] >= thresh) & (arr[:, :, 1] >= thresh) & (arr[:, :, 2] >= thresh)

    bg = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()
    for x in range(w):
        if is_white[0, x]:
            bg[0, x] = True
            q.append((0, x))
        if is_white[h - 1, x]:
            bg[h - 1, x] = True
            q.append((h - 1, x))
    for y in range(h):
        if is_white[y, 0] and not bg[y, 0]:
            bg[y, 0] = True
            q.append((y, 0))
        if is_white[y, w - 1] and not bg[y, w - 1]:
            bg[y, w - 1] = True
            q.append((y, w - 1))

    while q:
        cy, cx = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and is_white[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    arr[bg, 3] = 0

    padded = np.pad(bg, 1, mode="constant", constant_values=True)
    adj_bg = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
    ) & (~bg)
    lum = arr[:, :, :3].mean(axis=2)
    fringe = adj_bg & (lum > 205)
    arr[fringe, 3] = np.clip((255 - lum[fringe]) * 4.0, 0, 255).astype(np.uint8)

    return Image.fromarray(arr, mode="RGBA")


def punch_peach_face_hole(hair_rgba: Image.Image) -> Image.Image:
    """Punch out the blank peach face oval inside front hair sprites."""
    arr = np.asarray(hair_rgba, dtype=np.uint8).copy()
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_peach = (a > 128) & (r > 210) & (g > 165) & (b > 135) & ((r.astype(int) - b.astype(int)) > 12)

    sx, sy = int(w * 0.50), int(h * 0.42)
    seed = None
    for rad in range(0, 36):
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                ny, nx = sy + dy, sx + dx
                if 0 <= ny < h and 0 <= nx < w and is_peach[ny, nx]:
                    seed = (ny, nx)
                    break
            if seed:
                break
        if seed:
            break

    if seed:
        hole = np.zeros((h, w), dtype=bool)
        q = deque([seed])
        hole[seed] = True
        while q:
            cy, cx = q.popleft()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < h and 0 <= nx < w and not hole[ny, nx] and is_peach[ny, nx]:
                    hole[ny, nx] = True
                    q.append((ny, nx))
        padded = np.pad(hole, 2, mode="constant", constant_values=False)
        dil = (
            padded[:-4, 2:-2] | padded[4:, 2:-2] | padded[2:-2, :-4] | padded[2:-2, 4:] | hole
        )
        arr[dil, 3] = 0

    return Image.fromarray(arr, mode="RGBA")


def place_on_canvas(
    part: Image.Image,
    scale: float,
    anchor_x: int,
    anchor_y: int,
    *,
    align_y: str = "center",
) -> Image.Image:
    nw = max(1, int(round(part.width * scale)))
    nh = max(1, int(round(part.height * scale)))
    resized = part.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    px = int(round(anchor_x - nw / 2))
    if align_y == "bottom":
        py = int(round(anchor_y - nh))
    elif align_y == "top":
        py = int(round(anchor_y))
    else:
        py = int(round(anchor_y - nh / 2))
    canvas.paste(resized, (px, py), resized)
    return canvas


def split_front_back_hair(hair_canvas: Image.Image, chin_y: int = 258) -> tuple[Image.Image, Image.Image]:
    arr = np.asarray(hair_canvas, dtype=np.uint8)
    front = arr.copy()
    back = arr.copy()
    front[chin_y:, :, 3] = 0
    front[chin_y - 16 : chin_y, 200:320, 3] = 0
    return Image.fromarray(front, mode="RGBA"), Image.fromarray(back, mode="RGBA")


def main() -> None:
    repo = Path(__file__).resolve().parent.parent
    art_dir = Path("/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/e1748774-feea-4c04-b037-5491d0414e3e")
    poses_src = Image.open(art_dir / "chibi_headless_poses_1795194403347.jpg").convert("RGBA")
    fem_src = Image.open(art_dir / "chibi_female_parts_1795194401205.jpg").convert("RGBA")

    common_dir = repo / "public" / "assets" / "paper_doll" / "common"
    fem_dir = repo / "public" / "assets" / "paper_doll" / "female"
    common_dir.mkdir(parents=True, exist_ok=True)
    fem_dir.mkdir(parents=True, exist_ok=True)

    # 1. Universal Headless Chibi Poses (idle, run_1, run_2, attack) -> 512x640 RGBA
    pose_specs = [
        ("body_idle.png", (52, 94, 312, 635), 572.0 / 541.0, 256, 614, 246),
        ("body_run_1.png", (362, 105, 664, 639), 564.0 / 534.0, 256, 614, 252),
        ("body_run_2.png", (692, 108, 976, 642), 564.0 / 534.0, 256, 614, 254),
        ("body_attack.png", (996, 160, 1335, 651), 548.0 / 491.0, 272, 614, 256),
    ]
    for fname, box, sc, ax, ay, neck_cut_y in pose_specs:
        crop = remove_outer_white(poses_src.crop(box))
        canvas = place_on_canvas(crop, sc, ax, ay, align_y="bottom")
        # Remove the blank head above neck_cut_y so it is a TRUE headless body!
        arr = np.asarray(canvas, dtype=np.uint8).copy()
        arr[:neck_cut_y, :, 3] = 0
        Image.fromarray(arr, mode="RGBA").save(common_dir / fname)

    # 2. Female Expressions (4 crisp anime heads scaled to canonical HEAD_CX, HEAD_CY)
    fem_faces = {
        "vui_ve": (1020, 56, 1154, 192),
        "lanh_lung": (1186, 56, 1320, 192),
        "tinh_nghich": (1020, 235, 1154, 371),
        "ngay_tho": (1186, 235, 1320, 371),
    }
    for name, box in fem_faces.items():
        face = remove_outer_white(fem_src.crop(box))
        face_canvas = place_on_canvas(face, 1.48, HEAD_CX, HEAD_CY, align_y="center")
        face_canvas.save(fem_dir / f"face_{name}.png")

    # 3. Female Hairstyles (split into front & back + dedicated back_view!)
    f_hair0 = punch_peach_face_hole(remove_outer_white(fem_src.crop((60, 52, 294, 386))))
    fh0_full = place_on_canvas(f_hair0, 1.38, HEAD_CX + 6, HEAD_CY + 72, align_y="center")
    fh0_front, fh0_back = split_front_back_hair(fh0_full, chin_y=218)
    fh0_front.save(fem_dir / "hair_0_front.png")
    fh0_back.save(fem_dir / "hair_0_back.png")

    f_hair1 = punch_peach_face_hole(remove_outer_white(fem_src.crop((318, 52, 566, 344))))
    fh1_full = place_on_canvas(f_hair1, 1.36, HEAD_CX, HEAD_CY + 46, align_y="center")
    fh1_front, fh1_back = split_front_back_hair(fh1_full, chin_y=260)
    fh1_front.save(fem_dir / "hair_1_front.png")
    fh1_back.save(fem_dir / "hair_1_back.png")

    f_hair_back = remove_outer_white(fem_src.crop((594, 52, 804, 380)))
    place_on_canvas(f_hair_back, 1.38, HEAD_CX, HEAD_CY + 72, align_y="center").save(
        fem_dir / "hair_back.png"
    )

    # 4. Female Outfits (4 crisp Xianxia dresses/robes aligned collar-to-boots on 512x640)
    fem_outfits = {
        "ngoai_mon": ((34, 422, 344, 723), 1.26, 258, 620),
        "dao_si": ((352, 424, 576, 723), 1.26, 258, 620),
        "kiem_khach": ((602, 420, 824, 722), 1.26, 258, 620),
        "luyen_dan": ((1094, 422, 1348, 723), 1.26, 258, 620),
    }
    for name, (box, sc, ax, ay) in fem_outfits.items():
        out = remove_outer_white(fem_src.crop(box))
        place_on_canvas(out, sc, ax, ay, align_y="bottom").save(fem_dir / f"outfit_{name}.png")

    # Render visual verification sheet (4 Female outfits + Universal Headless Run & Attack poses!)
    combos = [
        (fem_dir / "hair_0_back.png", None, fem_dir / "outfit_ngoai_mon.png", fem_dir / "face_vui_ve.png", fem_dir / "hair_0_front.png"),
        (fem_dir / "hair_1_back.png", None, fem_dir / "outfit_kiem_khach.png", fem_dir / "face_lanh_lung.png", fem_dir / "hair_1_front.png"),
        (fem_dir / "hair_0_back.png", None, fem_dir / "outfit_luyen_dan.png", fem_dir / "face_tinh_nghich.png", fem_dir / "hair_0_front.png"),
        (None, common_dir / "body_run_1.png", None, fem_dir / "face_ngay_tho.png", fem_dir / "hair_1_front.png"),
        (None, common_dir / "body_attack.png", None, fem_dir / "face_lanh_lung.png", fem_dir / "hair_0_front.png"),
        (None, None, fem_dir / "outfit_dao_si.png", None, fem_dir / "hair_back.png"),
    ]
    thumb_w, thumb_h = 256, 320
    sheet = Image.new("RGB", (thumb_w * 3, thumb_h * 2), (42, 58, 62))
    for idx, layers in enumerate(combos):
        r, c = divmod(idx, 3)
        cell = Image.new("RGBA", (CANVAS_W, CANVAS_H), (42, 58, 62, 255))
        for p in layers:
            if not p or not p.exists():
                continue
            cell.alpha_composite(Image.open(p).convert("RGBA"))
        sheet.paste(cell.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS).convert("RGB"), (c * thumb_w, r * thumb_h))

    scratch = art_dir / "scratch"
    scratch.mkdir(parents=True, exist_ok=True)
    sheet.save(scratch / "chibi_universal_test.png")
    print("Extracted high-res 512x640 Universal Headless Poses & Female Chibi PNGs!")


if __name__ == "__main__":
    main()
