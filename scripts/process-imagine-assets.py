#!/usr/bin/env python3
"""Chroma-key Imagine PNGs into public/assets for Phaser."""
from pathlib import Path
from PIL import Image

SRC = Path.home() / ".cursor/projects/Users-brennen-dev-poke/assets"
DST = Path(__file__).resolve().parents[1] / "public" / "assets"
KEYS = [(200, 200, 200), (255, 255, 255), (240, 240, 240), (232, 232, 232), (210, 210, 210)]


def near_key(px, tol=38):
    r, g, b, a = px
    if a < 8:
        return True
    for kr, kg, kb in KEYS:
        if abs(r - kr) <= tol and abs(g - kg) <= tol and abs(b - kb) <= tol:
            if max(r, g, b) - min(r, g, b) <= 18:
                return True
    return False


def near_black(px, tol=28):
    r, g, b, a = px
    if a < 8:
        return True
    return r <= tol and g <= tol and b <= tol


def punch_dark_studio_bg(im: Image.Image, tol: int = 28) -> Image.Image:
    """Flood-fill near-black from image edges so dark outlines stay intact."""
    src = im.convert("RGBA")
    w, h = src.size
    px = src.load()
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []
    for x, y in (
        (0, 0),
        (w - 1, 0),
        (0, h - 1),
        (w - 1, h - 1),
        (w // 2, 0),
        (w // 2, h - 1),
        (0, h // 2),
        (w - 1, h // 2),
    ):
        if near_black(px[x, y], tol):
            stack.append((x, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        if not near_black(px[x, y], tol):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return src


def is_soft_rim(px, alpha_cut: int = 160) -> bool:
    """Semi-transparent fringe only — never punch solid peat/ember body color."""
    _r, _g, _b, a = px
    return a < alpha_cut


def punch_soft_rim(im: Image.Image) -> Image.Image:
    """After dark cutout, erase edge-connected semi-transparent fringe."""
    src = im.convert("RGBA")
    w, h = src.size
    px = src.load()
    stack: list[tuple[int, int]] = []
    visited = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if px[x, y][3] < 8:
                stack.append((x, y))
                visited[y][x] = True

    while stack:
        x, y = stack.pop()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or visited[ny][nx]:
                continue
            visited[ny][nx] = True
            if not is_soft_rim(px[nx, ny]):
                continue
            px[nx, ny] = (0, 0, 0, 0)
            stack.append((nx, ny))
    return src


SCALE = 4


def harden_edge_alpha(im: Image.Image, alpha_cut: int = 160) -> None:
    """Zero soft pixels that touch transparency (post-downscale fringe only)."""
    px = im.load()
    w, h = im.size
    doomed: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8 or a >= alpha_cut:
                continue
            edge = False
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if nx < 0 or ny < 0 or nx >= w or ny >= h or px[nx, ny][3] < 8:
                    edge = True
                    break
            if edge:
                doomed.append((x, y))
    for x, y in doomed:
        px[x, y] = (0, 0, 0, 0)


def process(src_name, dest_rel, max_w, max_h, pad=4, dark_studio_bg=False):
    im = Image.open(SRC / src_name).convert("RGBA")
    if dark_studio_bg:
        im = punch_dark_studio_bg(im)
        im = punch_soft_rim(im)
    else:
        # Light chroma only for Imagine sheets; black-studio art keeps pale
        # highlights/smoke that would match KEYS (eye glints, bog wisps).
        pixels = im.load()
        w, h = im.size
        for y in range(h):
            for x in range(w):
                if near_key(pixels[x, y]):
                    pixels[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    if not bbox:
        print("EMPTY", src_name)
        return
    im = im.crop(bbox)
    padded = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    padded.paste(im, (pad, pad))
    padded.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
    if dark_studio_bg:
        harden_edge_alpha(padded)
    canvas = Image.new("RGBA", (max_w, max_h), (0, 0, 0, 0))
    ox = (max_w - padded.width) // 2
    oy = max_h - padded.height
    canvas.paste(padded, (ox, oy), padded)
    out = DST / dest_rel
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, optimize=True)
    print(f"ok {dest_rel}")


def main():
    for facing in ["south", "north", "east", "west"]:
        # Style D walk1 is canonical idle + stride frame 1 (outfit-matched).
        process(
            f"player-{facing}-walk1.png",
            f"player/player-{facing}-0.png",
            48 * SCALE,
            64 * SCALE,
        )
        process(
            f"player-{facing}-walk1.png",
            f"player/player-{facing}-1.png",
            48 * SCALE,
            64 * SCALE,
        )

    # Stride frame 2 — prefer readable limb change without different-trainer flash.
    player = DST / "player"

    # South/North: hflip walk1 (opposite contact, same outfit; no limb clipping).
    for facing in ("south", "north"):
        Image.open(player / f"player-{facing}-1.png").convert("RGBA").transpose(
            Image.Transpose.FLIP_LEFT_RIGHT
        ).save(player / f"player-{facing}-2.png", optimize=True)
        print(f"ok player/player-{facing}-2.png (hflip walk1)")

    # West: Imagine walk2 (outfit-matched side stride).
    process(
        "player-west-walk2.png",
        "player/player-west-2.png",
        48 * SCALE,
        64 * SCALE,
    )

    # East: mirror west walk cycle so right-facing has real limb motion.
    for frame in (0, 1, 2):
        src = Image.open(player / f"player-west-{frame}.png").convert("RGBA")
        src.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(
            player / f"player-east-{frame}.png",
            optimize=True,
        )
        print(f"ok player/player-east-{frame}.png (hflip west-{frame})")

    for c in [
        "mossling", "ember-wisp", "brook-nymph", "stone-hound", "mist-serpent",
        "rootwalker", "lantern-fox", "thunder-finch", "bramblewarden", "hearthflame",
    ]:
        process(
            f"creature-{c}.png",
            f"creatures/creature-{c}.png",
            48 * SCALE,
            52 * SCALE,
        )
    # Fen exclusives: Style D sheets on black studio bg (not light chroma).
    for c in ("peat-sprite", "cinder-toad", "bog-lantern"):
        process(
            f"creature-{c}.png",
            f"creatures/creature-{c}.png",
            48 * SCALE,
            52 * SCALE,
            dark_studio_bg=True,
        )
    for name, size in {
        "prop-tree.png": (48, 50),
        "prop-fern.png": (40, 32),
        "prop-shrine-altar.png": (48, 40),
        "prop-standing-stone.png": (42, 38),
        "prop-pebble-pile.png": (44, 32),
        "prop-hearth.png": (48, 40),
        "prop-cottage.png": (48, 44),
        "prop-gate.png": (48, 42),
        "prop-gate-locked.png": (48, 42),
    }.items():
        process(name, f"world/{name}", size[0] * SCALE, size[1] * SCALE)

    # Mistwood / Emberfen: no dedicated Imagine sheets yet — derive Style D
    # orthographic floors/borders from overworld + village so late regions
    # don't fall back to procedural isometric walls.
    derive_late_region_tiles()
    print("DONE")


def recolor_rgba(
    im: Image.Image,
    hue_shift_deg: float,
    sat_mul: float,
    val_mul: float,
    tint_rgb: tuple[int, int, int],
    tint_strength: float,
) -> Image.Image:
    import colorsys

    src = im.convert("RGBA")
    px = src.load()
    w, h = src.size
    out = Image.new("RGBA", (w, h))
    op = out.load()
    hue_shift = hue_shift_deg / 360.0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                op[x, y] = (0, 0, 0, 0)
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hh = (hh + hue_shift) % 1.0
            ss = min(1.0, max(0.0, ss * sat_mul))
            vv = min(1.0, max(0.0, vv * val_mul))
            rr, gg, bb = colorsys.hsv_to_rgb(hh, ss, vv)
            r2, g2, b2 = int(rr * 255), int(gg * 255), int(bb * 255)
            tr, tg, tb = tint_rgb
            mid = (r2 + g2 + b2) / (3 * 255)
            wgt = tint_strength * max(0.0, 1.0 - abs(mid - 0.55) * 1.2)
            wgt = min(0.55, wgt)
            r2 = int(r2 * (1 - wgt) + tr * wgt)
            g2 = int(g2 * (1 - wgt) + tg * wgt)
            b2 = int(b2 * (1 - wgt) + tb * wgt)
            op[x, y] = (
                max(0, min(255, r2)),
                max(0, min(255, g2)),
                max(0, min(255, b2)),
                a,
            )
    return out


def derive_late_region_tiles() -> None:
    world = DST / "world"
    jobs = [
        (
            "floor-overworld-light.png",
            "floor-mistwood-light.png",
            35,
            1.05,
            0.95,
            (190, 170, 235),
            0.30,
        ),
        (
            "floor-overworld-dark.png",
            "floor-mistwood-dark.png",
            40,
            1.10,
            0.90,
            (130, 110, 185),
            0.34,
        ),
        (
            "boundary-overworld.png",
            "boundary-mistwood.png",
            38,
            1.05,
            0.92,
            (150, 130, 205),
            0.32,
        ),
        (
            "floor-village-light.png",
            "floor-emberfen-light.png",
            -8,
            1.05,
            1.00,
            (232, 176, 100),
            0.28,
        ),
        (
            "floor-village-dark.png",
            "floor-emberfen-dark.png",
            -12,
            1.08,
            0.95,
            (180, 110, 70),
            0.32,
        ),
        (
            "boundary-village.png",
            "boundary-emberfen.png",
            -10,
            1.05,
            0.96,
            (200, 120, 70),
            0.30,
        ),
    ]
    for src_name, dst_name, hue, sat, val, tint, strength in jobs:
        src_path = world / src_name
        if not src_path.exists():
            print(f"SKIP {dst_name} (missing {src_name})")
            continue
        out = recolor_rgba(
            Image.open(src_path),
            hue,
            sat,
            val,
            tint,
            strength,
        )
        out.save(world / dst_name, optimize=True)
        print(f"ok world/{dst_name} (recolor {src_name})")


if __name__ == "__main__":
    main()
