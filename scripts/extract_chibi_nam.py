#!/usr/bin/env python3
"""
Extract and pixel-align all Male Chibi Paper Doll layers from nam.png onto a
unified 256x320 transparent RGBA canvas in public/assets/paper_doll/male/.

Layer order (bottom to top):
  1. hair_X_back.png   (long back hair behind body & outfit)
  2. body_base.png     (clean torso, arms, hands, neck — no hair/face overlap)
  3. outfit_X.png      (robe + boots aligned collar-to-feet)
  4. face_X.png        (complete clean bald chibi head with expression)
  5. hair_X_front.png  (crown, topknot, bangs & side locks over face)
  6. weapon_X.png      (spirit sword or folding fan)
"""
from collections import deque
from pathlib import Path
import sys
import numpy as np
from PIL import Image


CANVAS_W, CANVAS_H = 256, 320


def remove_outer_white(crop_rgba: Image.Image, thresh: int = 240) -> Image.Image:
    """Flood-fill remove ONLY outer white background, preserving inner white clothes & eye sclera."""
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

    # Soften 1-pixel bright fringe adjacent to background
    padded = np.pad(bg, 1, mode="constant", constant_values=True)
    adj_bg = (
        padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:]
    ) & (~bg)
    lum = arr[:, :, :3].mean(axis=2)
    fringe = adj_bg & (lum > 210)
    arr[fringe, 3] = np.clip((255 - lum[fringe]) * 4.2, 0, 255).astype(np.uint8)

    return Image.fromarray(arr, mode="RGBA")


def punch_peach_face_hole(hair_rgba: Image.Image) -> Image.Image:
    """Make the blank peach face oval inside front hair sprites transparent."""
    arr = np.asarray(hair_rgba, dtype=np.uint8).copy()
    h, w = arr.shape[:2]
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    is_peach = (a > 128) & (r > 212) & (g > 168) & (b > 138) & ((r.astype(int) - b.astype(int)) > 14)

    sx, sy = int(w * 0.46), int(h * 0.44)
    seed = None
    for rad in range(0, 24):
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
        # Dilate hole by 1px to eat dark chin outline around the dummy peach face
        padded = np.pad(hole, 1, mode="constant", constant_values=False)
        dil = padded[:-2, 1:-1] | padded[2:, 1:-1] | padded[1:-1, :-2] | padded[1:-1, 2:] | hole
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


def split_front_back_hair(hair_canvas: Image.Image, chin_y: int = 122) -> tuple[Image.Image, Image.Image]:
    """Split a long hair sprite into (front_hair, back_hair) cleanly around the chin line."""
    arr = np.asarray(hair_canvas, dtype=np.uint8)
    front = arr.copy()
    back = arr.copy()
    # Back hair keeps the full silhouette behind the body & head
    # Front hair removes everything below chin_y (long hair behind chest/neck stays in back!)
    front[chin_y:, :, 3] = 0
    # Also remove inner lower-neck pixels just above chin_y (x in 102..162, y in chin_y-10..chin_y)
    front[chin_y - 8 : chin_y, 102:162, 3] = 0
    return Image.fromarray(front, mode="RGBA"), Image.fromarray(back, mode="RGBA")


def main() -> None:
    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/antigravity/nam.png")
    out_dir = (
        Path(sys.argv[2])
        if len(sys.argv) > 2
        else Path(__file__).resolve().parent.parent / "public" / "assets" / "paper_doll" / "male"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    src = Image.open(src_path).convert("RGBA")

    # 1. Base Body (full reference) -> scaled to height 292px, bottom y=306, center x=128
    body_crop = remove_outer_white(src.crop((40, 36, 230, 470)))
    body_scale = 292.0 / body_crop.height
    body_full = place_on_canvas(body_crop, body_scale, 128, 306, align_y="bottom")
    body_full.save(out_dir / "body_front.png")

    # Create clean torso+hands-only body_base.png (head above y=128 & bare feet below y=266 removed so outfits' boots & faces snap cleanly!)
    body_base_arr = np.asarray(body_full, dtype=np.uint8).copy()
    body_base_arr[:128, :, 3] = 0
    body_base_arr[266:, :, 3] = 0
    Image.fromarray(body_base_arr, mode="RGBA").save(out_dir / "body_base.png")

    # Extract default hair_0_front.png from body_full (dark hair pixels on head y < 126)
    bf_arr = np.asarray(body_full, dtype=np.uint8)
    hair0_arr = bf_arr.copy()
    hair0_arr[124:, :, 3] = 0
    # Keep dark hair + white hairband, erase peach skin & brown eyes inside the face oval
    yy, xx = np.ogrid[:CANVAS_H, :CANVAS_W]
    # Face interior ellipse centered at (134, 98), rx=38, ry=30
    in_face = (((xx - 134) / 38.0) ** 2 + ((yy - 98) / 30.0) ** 2) <= 1.0
    r, g, b = bf_arr[:, :, 0], bf_arr[:, :, 1], bf_arr[:, :, 2]
    # Dark hair has low brightness (r < 95, g < 95, b < 100)
    is_dark_hair = (r < 95) & (g < 95) & (b < 100)
    # Inside lower face (y > 76), keep ONLY hair bangs on the very top/sides, erase skin + eyes + ears
    erase_face = in_face & (yy > 74) & (~(is_dark_hair & (yy < 92)))
    hair0_arr[erase_face, 3] = 0
    # Also erase lower ears/cheeks (peach pixels anywhere y > 80)
    is_peach = (r > 205) & (g > 155) & (b > 125) & ((r.astype(int) - b.astype(int)) > 16)
    hair0_arr[is_peach & (yy > 72), 3] = 0
    # Erase eye whites inside face
    is_eye_white = in_face & (yy > 82) & (r > 190) & (g > 190) & (b > 190)
    hair0_arr[is_eye_white, 3] = 0
    # Erase dark pupils inside face (y in 88..112, x in 106..162)
    hair0_arr[88:118, 104:164, 3] = 0
    Image.fromarray(hair0_arr, mode="RGBA").save(out_dir / "hair_0_front.png")

    # Head center on canonical 256x320 canvas
    head_cx = 132
    head_cy = 91

    # 2. Complete Bald Expression Heads (5 expressions: vui_ve, lanh_lung, quyet_tam, hoang_hot + default)
    expr_boxes = {
        "vui_ve": (758, 44, 854, 142),
        "lanh_lung": (880, 44, 976, 142),
        "quyet_tam": (758, 177, 854, 275),
        "hoang_hot": (880, 177, 976, 275),
    }
    for name, box in expr_boxes.items():
        face_raw = remove_outer_white(src.crop(box))
        face_canvas = place_on_canvas(face_raw, 1.03, head_cx, head_cy, align_y="center")
        face_canvas.save(out_dir / f"face_{name}.png")

    # 3. Hair 1 (long black + white ribbon) & Hair 2 (wavy brown) -> split front/back!
    hair1_raw = punch_peach_face_hole(remove_outer_white(src.crop((270, 30, 402, 230))))
    hair1_full = place_on_canvas(hair1_raw, 1.12, head_cx + 4, head_cy + 30, align_y="center")
    h1_front, h1_back = split_front_back_hair(hair1_full, chin_y=128)
    h1_front.save(out_dir / "hair_1_front.png")
    h1_back.save(out_dir / "hair_1_back.png")

    hair2_raw = punch_peach_face_hole(remove_outer_white(src.crop((418, 45, 550, 236))))
    hair2_full = place_on_canvas(hair2_raw, 1.12, head_cx + 1, head_cy + 34, align_y="center")
    h2_front, h2_back = split_front_back_hair(hair2_full, chin_y=128)
    h2_front.save(out_dir / "hair_2_front.png")
    h2_back.save(out_dir / "hair_2_back.png")

    # Hair Back View (walking upward!)
    hair_back_raw = remove_outer_white(src.crop((564, 26, 678, 238)))
    hair_back_canvas = place_on_canvas(hair_back_raw, 1.12, head_cx, head_cy + 32, align_y="center")
    hair_back_canvas.save(out_dir / "hair_back.png")

    # 4. Outfits (scaled to 0.90 so collar hugs neck and boots cover feet cleanly!)
    outfit_boxes = {
        "ngoai_mon": ((274, 312, 416, 522), 0.90, 128, 312),
        "kiem_khach": ((452, 311, 597, 522), 0.90, 128, 312),
        "dao_si": ((622, 312, 794, 522), 0.90, 128, 312),
    }
    for name, (box, sc, ax, ay) in outfit_boxes.items():
        out_raw = remove_outer_white(src.crop(box))
        out_canvas = place_on_canvas(out_raw, sc, ax, ay, align_y="bottom")
        out_canvas.save(out_dir / f"outfit_{name}.png")

    # 5. Weapons (sword & fan)
    sword_raw = remove_outer_white(src.crop((808, 338, 855, 510)))
    sword_canvas = place_on_canvas(sword_raw, 0.72, 212, 178, align_y="center")
    sword_canvas.save(out_dir / "weapon_sword.png")

    fan_raw = remove_outer_white(src.crop((862, 419, 995, 504)))
    fan_canvas = place_on_canvas(fan_raw, 0.56, 204, 212, align_y="center")
    fan_canvas.save(out_dir / "weapon_fan.png")

    # Render 6-combination visual verification sheet
    combos = [
        (None, "body_base", "outfit_ngoai_mon", "face_vui_ve", "hair_0_front", "weapon_sword"),
        ("hair_1_back", "body_base", "outfit_kiem_khach", "face_lanh_lung", "hair_1_front", "weapon_sword"),
        ("hair_2_back", "body_base", "outfit_dao_si", "face_vui_ve", "hair_2_front", "weapon_fan"),
        (None, "body_base", "outfit_kiem_khach", "face_quyet_tam", "hair_0_front", "weapon_sword"),
        ("hair_1_back", "body_base", "outfit_ngoai_mon", "face_hoang_hot", "hair_1_front", None),
        (None, "body_base", "outfit_dao_si", None, "hair_back", None),
    ]
    sheet = Image.new("RGB", (CANVAS_W * 3, CANVAS_H * 2), (42, 58, 62))
    for idx, layers in enumerate(combos):
        r, c = divmod(idx, 3)
        cell = Image.new("RGBA", (CANVAS_W, CANVAS_H), (42, 58, 62, 255))
        for k in layers:
            if not k:
                continue
            layer = Image.open(out_dir / f"{k}.png").convert("RGBA")
            cell.alpha_composite(layer)
        sheet.paste(cell.convert("RGB"), (c * CANVAS_W, r * CANVAS_H))

    scratch = Path("/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/e1748774-feea-4c04-b037-5491d0414e3e/scratch")
    scratch.mkdir(parents=True, exist_ok=True)
    sheet.save(scratch / "chibi_nam_test.png")
    print("Re-extracted aligned Male Chibi layers cleanly!")


if __name__ == "__main__":
    main()
