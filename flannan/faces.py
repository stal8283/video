"""Animated hand-drawn cartoon faces in the reference style.

Each character has an IDENTITY (fixed look: face shape, skin, brows, eyes, nose, wrinkles, extras)
and a per-frame STATE (eyelids, brows, pupils, mouth, tilt) driven by an emotion timeline with
automatic blinks, eye darts and head wobble."""
import math, random
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter

LINE = (18, 16, 14)
WHITE = (255, 255, 255)
SKINS = [(216, 186, 158), (226, 196, 168), (204, 170, 138), (222, 180, 150), (196, 162, 128)]
BROWS = [(52, 32, 10), (24, 20, 18), (120, 96, 52), (150, 146, 140), (86, 52, 24)]


def random_identity(seed):
    r = random.Random(seed * 101 + 7)
    return dict(
        wide=r.uniform(0.88, 1.04), long=r.uniform(1.0, 1.16), jaw=r.uniform(0, 1),
        skin=r.randrange(len(SKINS)), brow_col=r.randrange(len(BROWS)), brow_th=r.uniform(0.75, 1.45),
        eye_sz=r.uniform(0.82, 1.14), eye_gap=r.uniform(0.17, 0.225), eye_y=r.uniform(0.36, 0.42),
        nose=r.choice(["lines", "bulb", "hook", "lines"]), wrinkles=r.choice([0, 1, 1, 2]),
        mustache=r.random() < 0.25, stubble=r.random() < 0.3, mole=r.random() < 0.2, bags=r.uniform(0.6, 1.2),
        mouth_w=r.uniform(0.85, 1.2))


# expression presets -> state params
EXPR = {
    "neutral":    dict(open=1.0, low=0.0, big=1.0, pupil=1.0, brow=0.0, ang=0.0, mouth="flat", mo=0.0),
    "content":    dict(open=0.75, low=0.15, big=1.0, pupil=1.0, brow=0.1, ang=0.0, mouth="smile", mo=0.2),
    "happy":      dict(open=0.55, low=0.3, big=1.0, pupil=1.0, brow=0.3, ang=0.1, mouth="grin", mo=0.6),
    "worried":    dict(open=1.0, low=0.0, big=1.0, pupil=1.0, brow=0.4, ang=1.0, mouth="frown", mo=0.5),
    "shock":      dict(open=1.0, low=0.0, big=1.25, pupil=0.7, brow=1.0, ang=0.3, mouth="O", mo=0.8),
    "scared":     dict(open=1.0, low=0.0, big=1.2, pupil=0.75, brow=0.8, ang=1.2, mouth="scream", mo=0.9),
    "suspicious": dict(open=0.45, low=0.25, big=1.0, pupil=1.0, brow=-0.3, ang=-0.4, mouth="side", mo=0.0, skew=1.0),
    "smug":       dict(open=0.42, low=0.1, big=1.0, pupil=1.0, brow=-0.1, ang=-0.3, mouth="smirk", mo=0.2),
    "smugsmile":  dict(open=0.0, low=0.0, big=1.0, pupil=1.0, brow=0.2, ang=0.0, mouth="grin", mo=0.4),
    "sad":        dict(open=0.7, low=0.0, big=1.0, pupil=1.0, brow=0.3, ang=1.3, mouth="frown", mo=0.15),
    "deadpan":    dict(open=0.35, low=0.2, big=1.05, pupil=0.0, brow=0.0, ang=0.2, mouth="frown", mo=0.35),
    "angry":      dict(open=0.8, low=0.2, big=1.0, pupil=1.0, brow=-0.4, ang=-1.2, mouth="grimace", mo=0.5),
    "confused":   dict(open=1.0, low=0.0, big=1.05, pupil=1.0, brow=0.5, ang=0.2, mouth="wavy", mo=0.3, skew=-1.0),
}
NUM = ("open", "low", "big", "pupil", "brow", "ang", "mo", "skew")


def blend_state(a, b, f):
    s = {k: a.get(k, 0.0) + (b.get(k, 0.0) - a.get(k, 0.0)) * f for k in NUM}
    s["mouth"] = a["mouth"] if f < 0.5 else b["mouth"]
    return s


def curve(cx, cy, rx, ry, a0, a1, n=24):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def stroke(d, pts, w, col=LINE):
    d.line(pts, fill=col + (255,), width=max(1, int(w)), joint="curve")
    r = w / 2
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,))


def wob(pts, rnd, amt):
    return [(x + rnd.uniform(-amt, amt), y + rnd.uniform(-amt, amt)) for x, y in pts]


def draw_face(W, ident, st, seed):
    S = 2
    w = int(W * S)
    h = int(W * 1.08 * ident["long"] * S)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    skin = SKINS[ident["skin"]]
    browc = BROWS[ident["brow_col"]]
    lw = max(3, w * 0.022)
    cx, cy = w / 2, h * 0.5
    # head outline
    pts = []
    for i in range(72):
        a = 2 * math.pi * i / 72
        rx, ry = w * 0.47 * ident["wide"], h * 0.47
        x, y = math.cos(a) * rx, math.sin(a) * ry
        if y > 0:
            x *= 1 - (0.04 + 0.12 * ident["jaw"]) * (y / ry) ** 3
        pts.append((cx + x, cy + y))
    d.polygon(pts, fill=skin + (255,))
    if ident["stubble"]:
        for _ in range(160):
            a = rnd.uniform(0.15, 0.85) * math.pi
            rr = rnd.uniform(0.6, 0.95)
            x, y = cx + math.cos(a) * w * 0.4 * ident["wide"] * rr, cy + math.sin(a) * h * 0.44 * rr
            d.point((x, y), fill=(120, 100, 84, 255))
            d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(150, 126, 104, 255))
    d.line(pts + [pts[0]], fill=LINE + (255,), width=int(lw * 1.25), joint="curve")

    big = st["big"] * ident["eye_sz"]
    ey = h * ident["eye_y"]
    gap = w * ident["eye_gap"]
    skew = st.get("skew", 0.0)
    for side in (-1, 1):
        ex = cx + side * gap
        erx, ery = w * 0.115 * big, w * 0.085 * big
        # eye bags
        ba = min(1.0, 0.6 * ident["bags"])
        bag = tuple(int(skin[i] * (1 - ba) + (126, 116, 104)[i] * ba) for i in range(3)) + (255,)
        d.ellipse([ex - erx * 1.12, ey - ery * 0.5, ex + erx * 1.12, ey + ery * 1.55], fill=bag)
        stroke(d, wob(curve(ex, ey + ery * 1.25, erx * 0.95, ery * 0.6, 20, 160, 12), rnd, lw * 0.15), lw * 0.45)
        op = max(0.0, min(1.0, st["open"] - (0.25 * skew * side if skew else 0)))
        if op < 0.12:  # closed: curved lid line (happy-closed if smiling)
            if st["mouth"] in ("grin", "smile"):
                stroke(d, curve(ex, ey + ery * 0.4, erx * 0.95, ery * 0.8, 200, 340), lw * 1.3)
            else:
                stroke(d, curve(ex, ey - ery * 0.1, erx * 0.95, ery * 0.5, 20, 160), lw * 1.3)
        else:
            pad = int(lw * 1.2) + 2
            ew, eh = int(erx * 2) + pad * 2, int(ery * 2) + pad * 2
            eye = Image.new("RGBA", (ew, eh), (0, 0, 0, 0))
            ed = ImageDraw.Draw(eye)
            box = [pad, pad, pad + erx * 2, pad + ery * 2]
            ed.ellipse(box, fill=WHITE + (255,), outline=LINE + (255,), width=int(lw))
            pr = w * 0.016 * st["pupil"]
            lx, ly = st.get("lx", 0.0), st.get("ly", 0.0)
            px, py = pad + erx + lx * erx * 0.45, pad + ery + ly * ery * 0.4
            if pr > 0.5:
                ed.ellipse([px - pr, py - pr, px + pr, py + pr], fill=LINE + (255,))
            lid_y = pad + ery * 2 * (1 - op)
            if op < 0.98:
                ed.rectangle([0, 0, ew, lid_y], fill=skin + (255,))
                ed.line([(pad * 0.6, lid_y), (ew - pad * 0.6, lid_y)], fill=LINE + (255,), width=int(lw))
            if st["low"] > 0.01:
                low_y = pad + ery * 2 * (1 - st["low"])
                ed.rectangle([0, low_y, ew, eh], fill=skin + (255,))
                ed.line([(pad, low_y), (ew - pad, low_y)], fill=LINE + (255,), width=int(lw * 0.7))
            mask = Image.new("L", eye.size, 0)
            ImageDraw.Draw(mask).ellipse([pad - lw / 2, pad - lw / 2, pad + erx * 2 + lw / 2, pad + ery * 2 + lw / 2], fill=255)
            img.paste(eye, (int(ex - erx - pad), int(ey - ery - pad)), mask)
        # brows
        raise_ = st["brow"] + (0.35 * skew * side if skew else 0)
        by = ey - ery - h * 0.045 - raise_ * h * 0.03
        ang = st["ang"]
        inner = by - ang * h * 0.022
        outer = by + ang * h * 0.008
        x_in, x_out = cx + side * w * 0.07, cx + side * (gap + w * 0.13)
        bw = h * 0.045 * ident["brow_th"]
        top, bot = [], []
        n = 12
        for k in range(n + 1):
            f = k / n
            bx = x_in + (x_out - x_in) * f
            byy = inner + (outer - inner) * f - math.sin(f * math.pi) * h * 0.012
            th = bw * (0.55 + 0.45 * math.sin(f * math.pi) ** 0.5)
            top.append((bx, byy))
            bot.append((bx, byy + th))
        d.polygon(top + bot[::-1], fill=browc + (255,))
    # nose
    ny0, ny1 = h * 0.45, h * 0.6
    if ident["nose"] == "bulb":
        d.ellipse([cx - w * 0.07, ny1 - h * 0.05, cx + w * 0.07, ny1 + h * 0.04], outline=LINE + (255,), width=int(lw * 0.6))
        d.ellipse([cx - w * 0.066, ny1 - h * 0.046, cx + w * 0.066, ny1 + h * 0.036], fill=tuple(max(0, c - 14) for c in skin) + (255,))
    elif ident["nose"] == "hook":
        stroke(d, wob([(cx + w * 0.01, ny0), (cx + w * 0.05, ny0 + h * 0.08), (cx + w * 0.06, ny1), (cx - w * 0.01, ny1 + h * 0.01)], rnd, lw * 0.15), lw * 0.6)
    else:
        for side in (-1, 1):
            x0 = cx + side * w * 0.035
            stroke(d, wob([(x0, ny0 - h * 0.03), (x0 + side * w * 0.005, ny0 + h * 0.07), (x0 + side * w * 0.015, ny1)], rnd, lw * 0.2), lw * 0.55)
            nx = cx + side * w * 0.07
            stroke(d, curve(nx, ny1 + h * 0.02, w * 0.035, h * 0.012, 0 if side > 0 else 180, 180 if side > 0 else 0, 8)[:7], lw * 0.6)
    # wrinkles
    for _ in range(ident["wrinkles"]):
        for side in (-1, 1):
            stroke(d, wob([(cx + side * w * 0.2, h * 0.58), (cx + side * w * 0.22, h * 0.66), (cx + side * w * 0.19, h * 0.75)], rnd, lw * 0.4), lw * 0.4)
            stroke(d, wob([(cx + side * w * 0.33, h * 0.35), (cx + side * w * 0.37, h * 0.41)], rnd, lw * 0.3), lw * 0.35)
        stroke(d, wob([(cx - w * 0.12, h * 0.17), (cx, h * 0.155), (cx + w * 0.12, h * 0.17)], rnd, lw * 0.4), lw * 0.35)
    if ident["mole"]:
        d.ellipse([cx + w * 0.22, h * 0.62, cx + w * 0.245, h * 0.645], fill=(70, 50, 40, 255))
    # mouth
    mw = w * 0.13 * ident["mouth_w"]
    my = h * 0.77
    mo = st["mo"]
    m = st["mouth"]
    if m == "frown":
        top = curve(cx, my + h * 0.06, mw, h * (0.03 + 0.05 * mo), 195, 345)
        bot = curve(cx, my + h * 0.07, mw * 0.88, h * 0.03 * (1 - mo * 0.5), 345, 195)
        d.polygon(top + bot, fill=LINE + (255,))
    elif m == "O":
        rx, ry = w * (0.04 + 0.04 * mo), h * (0.03 + 0.06 * mo)
        d.ellipse([cx - rx, my - ry * 0.6, cx + rx, my + ry * 1.4], fill=LINE + (255,))
        d.ellipse([cx - rx * 0.5, my + ry * 0.6, cx + rx * 0.5, my + ry * 1.2], fill=(120, 40, 40, 255))
    elif m == "scream":
        # distressed open mouth: top edge arches UP (downturned corners), deep rounded bottom
        depth = h * (0.06 + 0.08 * mo)
        top = curve(cx, my + h * 0.03, mw * 0.95, h * 0.05, 180, 360)
        bot = curve(cx, my + h * 0.03, mw * 0.8, depth, 0, 180)
        d.polygon(top + bot, fill=LINE + (255,))
        d.ellipse([cx - mw * 0.35, my + h * 0.03 + depth * 0.35, cx + mw * 0.35, my + h * 0.03 + depth * 0.85], fill=(120, 40, 40, 255))
    elif m == "smile":
        stroke(d, curve(cx, my - h * 0.05, mw, h * 0.06, 25, 155), lw * 0.9)
    elif m == "grin":
        d.chord([cx - mw * 1.05, my - h * 0.1, cx + mw * 1.05, my + h * (0.03 + 0.04 * mo)], 0, 180, fill=LINE + (255,))
        d.chord([cx - mw * 0.9, my - h * 0.06, cx + mw * 0.9, my - h * 0.0], 0, 180, fill=WHITE + (255,))
    elif m == "smirk":
        stroke(d, [(cx - mw * 0.7, my + h * 0.01), (cx + mw * 0.3, my + h * 0.005), (cx + mw * 0.85, my - h * 0.035)], lw * 0.9)
    elif m == "side":
        stroke(d, [(cx - mw * 0.2, my + h * 0.01), (cx + mw * 0.7, my - h * 0.005)], lw * 0.9)
    elif m == "grimace":
        d.rounded_rectangle([cx - mw, my - h * 0.03, cx + mw, my + h * (0.03 + 0.03 * mo)], h * 0.02, fill=WHITE + (255,), outline=LINE + (255,), width=int(lw * 0.8))
        for k in (-0.5, 0, 0.5):
            d.line([(cx + mw * k, my - h * 0.03), (cx + mw * k, my + h * 0.05)], fill=LINE + (255,), width=int(lw * 0.5))
    elif m == "wavy":
        stroke(d, [(cx - mw * 0.8 + i * mw * 0.2, my + h * 0.012 * (1 if i % 2 else -1)) for i in range(9)], lw * 0.7)
    else:  # flat
        stroke(d, [(cx - mw * 0.6, my), (cx + mw * 0.6, my)], lw * 0.9)
    if ident["mustache"]:
        for side in (-1, 1):
            d.chord([cx + (0 if side > 0 else -mw * 1.1), my - h * 0.09, cx + (mw * 1.1 if side > 0 else 0), my - h * 0.01], 180, 360, fill=BROWS[ident["brow_col"]] + (255,))
    return img.resize((int(W), int(W * 1.08 * ident["long"])), Image.LANCZOS)


def _q(v, step=0.05):
    return round(v / step) * step


@lru_cache(maxsize=4000)
def _cached(W, ident_items, st_items, seed):
    return draw_face(W, dict(ident_items), dict(st_items), seed)


def face_image(W, ident, st, seed):
    st = {k: (_q(v) if isinstance(v, float) else v) for k, v in st.items()}
    return _cached(int(W), tuple(sorted(ident.items())), tuple(sorted(st.items())), seed)


# ---------------- animation ----------------
def state_at(face, t):
    """face: dict with 'acts' [[time, expr], ...] (global seconds), 'seed'. Returns (state, tilt_deg, pop_scale)."""
    acts = face.get("acts") or [[0, face.get("expr", "worried")]]
    seed = face.get("seed", 0)
    prev, cur, t0 = acts[0][1], acts[0][1], acts[0][0]
    for at, ex in acts:
        if at <= t:
            prev, cur, t0 = cur, ex, at
    f = min(1.0, max(0.0, (t - t0) / 0.12))
    st = blend_state(EXPR[prev], EXPR[cur], f) if t >= t0 else dict(EXPR[cur])
    st = dict(st)
    r = random.Random(seed * 31)
    # blinks every 2-4.5s
    bt = r.uniform(0.3, 1.5)
    while bt < t + 1:
        if 0 <= t - bt < 0.16:
            k = 1 - abs((t - bt) / 0.08 - 1)  # 0..1..0
            st["open"] = st["open"] * (1 - k)
        bt += r.uniform(2.0, 4.5)
    # eye darts: pupils jump to a new spot every ~0.6-1.6s
    lt, lx, ly = 0.0, face.get("look", [0, 0])[0], face.get("look", [0, 0])[1]
    r2 = random.Random(seed * 53)
    while True:
        nt = lt + r2.uniform(0.6, 1.6)
        if nt > t:
            break
        lt = nt
        lx = face.get("look", [0, 0])[0] + r2.uniform(-0.7, 0.7)
        ly = face.get("look", [0, 0])[1] + r2.uniform(-0.3, 0.3)
    st["lx"], st["ly"] = max(-1, min(1, lx)), max(-1, min(1, ly))
    # trembling mouth/eyes when scared or shocked
    if cur in ("scared", "shock"):
        st["mo"] = st["mo"] * (0.8 + 0.2 * math.sin(t * 40 + seed))
    tilt = 3.0 * math.sin(t * 1.3 + seed) + (2.5 * math.sin(t * 30) if cur == "scared" else 0)
    pop = 1 + 0.07 * (1 - min(1, (t - t0) / 0.15)) if t >= t0 and t0 > acts[0][0] else 1.0
    return st, tilt, pop


def paste_face(plate, orig, cx, cy, W, ident, st, seed, hat_y=None, tilt=0.0, alpha=255):
    """Paste face centred at (cx, cy) with width W onto plate (in place region-wise). `orig` is the clean plate,
    used to restore the hat/hair over the top of the face."""
    f = face_image(W, ident, st, seed)
    if abs(tilt) > 0.3:
        f = f.rotate(tilt, resample=Image.BICUBIC, expand=True)
    if alpha < 255:
        f = f.copy()
        f.putalpha(f.getchannel("A").point(lambda v: v * alpha // 255))
    fx, fy = int(cx - f.width / 2), int(cy - f.height / 2)
    x0, y0 = max(0, fx), max(0, fy)
    x1, y1 = min(plate.width, fx + f.width), min(plate.height, fy + f.height)
    if x1 <= x0 or y1 <= y0:
        return plate
    region = plate.crop((x0, y0, x1, y1))
    region.alpha_composite(f, (0, 0), (x0 - fx, y0 - fy, x1 - fx, y1 - fy))
    if hat_y is not None and hat_y > y0:
        m = Image.new("L", region.size, 0)
        md = ImageDraw.Draw(m)
        hy = hat_y - y0
        md.ellipse([-W * 0.1, hy - region.height * 1.3, region.width + W * 0.1, hy], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(max(2, W * 0.008)))
        region = Image.composite(orig.crop((x0, y0, x1, y1)), region, m)
    plate.paste(region, (x0, y0))
    return plate


if __name__ == "__main__":
    out = Image.new("RGBA", (6 * 330, 2 * 400), (90, 100, 110, 255))
    names = list(EXPR)
    for i in range(12):
        ident = random_identity(i)
        out.alpha_composite(face_image(300, ident, dict(EXPR[names[i % len(names)]]), i), (15 + (i % 6) * 330, 15 + (i // 6) * 400))
    out.convert("RGB").save("/tmp/claude-0/-home-user-video/18fe20f0-4620-537c-b127-40cecd611e8a/scratchpad/faces_var.png")
