"""Flannan Isles short in the reference style.

Still photo backgrounds + full-body cutout characters with full-head cartoon faces.
Characters slide in on cue; faces only change on story beats; ~3s shots with hard cuts;
one-word captions; soft fade-in titles; red marker icons on clues.
Usage: python3 render.py [--preview T1,T2,...]"""
import json, math, os, random, subprocess, sys
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
import characters as CH

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
FPS = 30
DUR = 58.4
WORDS = json.load(open(os.path.join(HERE, "words.json")))
F_CAP = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
F_TITLE = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
RED = (232, 30, 30)


def ease_out(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def font(p, s, _c={}):
    if (p, s) not in _c:
        _c[(p, s)] = ImageFont.truetype(p, s)
    return _c[(p, s)]


# ---------------- backgrounds ----------------
FALLBACK = {"B13": "B3", "B14": "B7", "B15": "B5", "B16": "B1"}
_BG = {}


def bg(name, mode=""):
    k = (name, mode)
    if k in _BG:
        return _BG[k]
    for d in ("bgfix", "leo"):
        path = os.path.join(HERE, d, name + ".jpg")
        if os.path.exists(path):
            break
    else:
        return bg(FALLBACK[name], mode)
    im = Image.open(path).convert("RGB").resize((W, H), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(2, 50, 2))
    if mode == "night":   # same place, dark and empty (the reference's "dies" shot)
        im = ImageEnhance.Brightness(im).enhance(0.42)
        r, g, b = im.split()
        im = Image.merge("RGB", (r.point(lambda v: int(v * 0.8)), g.point(lambda v: int(v * 0.9)), b.point(lambda v: min(255, int(v * 1.15)))))
    if mode == "blur":    # close-up reaction shot background
        im = im.resize((int(W * 1.3), int(H * 1.3))).crop((int(W * 0.15), int(H * 0.1), int(W * 1.15), int(H * 1.1))).resize((W, H))
        im = im.filter(ImageFilter.GaussianBlur(14))
    _BG[k] = im.convert("RGBA")
    return _BG[k]


# ---------------- text & icons ----------------
def soft_text(img, text, cx, cy, size, t_in, t_out=None, gt=0.0, fnt=F_TITLE, col=(255, 255, 255)):
    """Reference-style title: fades in with a blur, drifts slightly, fades out."""
    if gt < t_in or (t_out is not None and gt > t_out + 0.3):
        return img
    a = min(1.0, (gt - t_in) / 0.35)
    if t_out is not None and gt > t_out:
        a *= max(0.0, 1 - (gt - t_out) / 0.3)
    blur = 8 * (1 - min(1.0, (gt - t_in) / 0.35))
    f = font(fnt, size)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    bb = d.textbbox((0, 0), text, font=f, stroke_width=3)
    x = cx - (bb[2] - bb[0]) / 2 - bb[0]
    y = cy - (bb[3] - bb[1]) / 2 - bb[1] - 6 * min(1.0, (gt - t_in) / 2)
    d.text((x + 3, y + 4), text, font=f, fill=(0, 0, 0, 120))
    d.text((x, y), text, font=f, fill=col + (255,), stroke_width=2, stroke_fill=(30, 30, 30, 200))
    if blur > 0.3:
        lay = lay.filter(ImageFilter.GaussianBlur(blur))
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
    return Image.alpha_composite(img, lay)


def arc_text(img, text, cx, cy, radius, size, t_in, t_out, gt):
    """Curved label like the reference's “URAL MOUNTAINS”."""
    if gt < t_in or gt > t_out + 0.3:
        return img
    a = min(1.0, (gt - t_in) / 0.35) * (max(0.0, 1 - (gt - t_out) / 0.3) if gt > t_out else 1)
    f = font(F_TITLE, size)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    widths = [f.getbbox(ch)[2] - f.getbbox(ch)[0] + (size * 0.28 if ch == " " else size * 0.06) for ch in text]
    total = sum(widths)
    ang = -total / radius / 2
    for ch, wch in zip(text, widths):
        mid = ang + wch / radius / 2
        g = Image.new("RGBA", (size * 2, size * 2), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        gd.text((size, size), ch, font=f, anchor="mm", fill=(255, 255, 255, 255), stroke_width=2, stroke_fill=(30, 30, 30, 220))
        g = g.rotate(-math.degrees(mid), resample=Image.BICUBIC)
        px = cx + radius * math.sin(mid)
        py = cy - radius * math.cos(mid) + radius
        lay.alpha_composite(g, (int(px - size), int(py - size)))
        ang += wch / radius
    blur = 6 * (1 - min(1.0, (gt - t_in) / 0.35))
    if blur > 0.3:
        lay = lay.filter(ImageFilter.GaussianBlur(blur))
    lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
    return Image.alpha_composite(img, lay)


def marker(img, kind, box, t_in, gt, seed=0):
    """Red hand-drawn marker icons (circle / dashed box / X) that draw on quickly."""
    if gt < t_in:
        return img
    p = min(1.0, (gt - t_in) / 0.25)
    x0, y0, x1, y1 = box
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    if kind == "circle":
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
        n = int(64 * p * 1.08)
        pts = [(cx + rx * (1 + 0.04 * math.sin(i * 0.4 + seed)) * math.cos(-math.pi / 2 + i / 60 * 2 * math.pi),
                cy + ry * (1 + 0.04 * math.cos(i * 0.3)) * math.sin(-math.pi / 2 + i / 60 * 2 * math.pi)) for i in range(n)]
        if len(pts) > 1:
            d.line(pts, fill=RED + (255,), width=11, joint="curve")
    elif kind == "dashed":
        edges = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
        for (ax, ay), (bx, by) in edges:
            L = math.hypot(bx - ax, by - ay); n = max(2, int(L // 34))
            for i in range(0, int(n * p), 2):
                f0, f1 = i / n, (i + 1) / n
                d.line([(ax + (bx - ax) * f0, ay + (by - ay) * f0), (ax + (bx - ax) * f1, ay + (by - ay) * f1)], fill=RED + (255,), width=9)
    elif kind == "x":
        q1 = min(1, p * 2)
        d.line([(x0, y0), (x0 + (x1 - x0) * q1, y0 + (y1 - y0) * q1)], fill=RED + (255,), width=13)
        if p > 0.5:
            q = (p - 0.5) * 2
            d.line([(x1, y0), (x1 - (x1 - x0) * q, y0 + (y1 - y0) * q)], fill=RED + (255,), width=13)
    return Image.alpha_composite(img, lay)


def rain(img, f, n=300, alpha=95):
    rnd = random.Random(f * 7919)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for _ in range(n):
        x, y = rnd.uniform(-200, W), rnd.uniform(-100, H)
        L = rnd.uniform(50, 95)
        d.line([(x, y), (x + L * 0.35, y + L)], fill=(215, 222, 235, alpha), width=2)
    return Image.alpha_composite(img, lay)


def flash(img, a=150):
    return Image.alpha_composite(img, Image.new("RGBA", img.size, (225, 232, 255, a)))


# ---------------- characters on screen ----------------
def _paste_clip(img, s, px, py):
    x0, y0 = max(0, px), max(0, py)
    x1, y1 = min(img.width, px + s.width), min(img.height, py + s.height)
    if x1 > x0 and y1 > y0:
        img.alpha_composite(s.crop((x0 - px, y0 - py, x1 - px, y1 - py)), (x0, y0))


def place(img, name, expr, x, feet, height, gt, enter=None, t_enter=0.0, move=None, bob=0.0):
    """Draw a character with feet at (x, feet) and body height `height`.
    enter = 'left' | 'right' | 'up' slide-in starting at t_enter (the reference's pop-ins);
    move = (t0, t1, x1, feet1, height1) for walking/running, bob = step bob in px."""
    if gt < t_enter:
        return img
    if move:
        t0, t1, x1, f1, h1 = move
        k = max(0.0, min(1.0, (gt - t0) / (t1 - t0)))
        x, feet, height = x + (x1 - x) * k, feet + (f1 - feet) * k, height + (h1 - height) * k
        if bob and 0 < k < 1:
            feet -= abs(math.sin((gt - t0) * 9)) * bob
    if enter:
        k = ease_out((gt - t_enter) / 0.35)
        if enter == "left":
            x = -W * 0.45 + (x + W * 0.45) * k
        elif enter == "right":
            x = W * 1.45 + (x - W * 1.45) * k
        elif enter == "up":
            feet = feet + (1 - k) * height * 0.6
    s, _ = CH.sprite_h(name, expr, int(height))
    _paste_clip(img, s, int(x - s.width / 2), int(feet - s.height))
    return img


def expr_at(track, gt):
    cur = track[0][1]
    for t, e in track:
        if gt >= t:
            cur = e
    return cur



# ---------------- vanish effect: bodies vanish, clothes drop ----------------
KEEPERS = [("C2", 250, 1700, 1080, 3.86, -1), ("C3", 835, 1700, 1080, 3.98, 1), ("C1", 540, 1760, 1150, 3.80, 1)]
FALL = 0.5
_PARTS = {}


def scaled_parts(name, height):
    k = (name, height)
    if k not in _PARTS:
        hat, clo, boots, collar, boots_y = CH.clothes_parts(name)
        sc = height / hat.height
        size = (max(1, int(hat.width * sc)), int(height))
        hat_s, clo_s, boots_s = (im.resize(size, Image.LANCZOS) for im in (hat, clo, boots))
        _PARTS[k] = (sc, hat_s.crop(hat_s.getbbox()), hat_s.getbbox(), clo_s.crop((0, int(collar * sc), size[0], int(boots_y * sc))),
                     int(collar * sc), int(boots_y * sc), boots_s)
    return _PARTS[k]


def crumple(im, p, seed, wf=1.3, hf=0.34):
    """Squash a clothing layer into a slumped pile: shorter, wider, soft wavy folds, slight tilt."""
    import numpy as np
    w0, h0 = im.size
    nw, nh = max(1, int(w0 * (1 + (wf - 1) * p))), max(1, int(h0 * (1 - (1 - hf) * p)))
    sq = np.asarray(im.resize((nw, nh), Image.BILINEAR))
    pad = 40
    out = np.zeros((nh, nw + 2 * pad, 4), np.uint8)
    for y in range(nh):
        dx = int(pad + 16 * p * math.sin(y / max(1, nh) * 9 + seed) + 8 * p * math.sin(y / max(1, nh) * 23 + seed * 2))
        out[y, dx:dx + nw] = sq[y]
    o = Image.fromarray(out, "RGBA")
    if p > 0.05:  # fold shading
        sh = Image.new("L", o.size, 0)
        sd = ImageDraw.Draw(sh)
        rnd = random.Random(seed)
        for i in range(1, 5):
            yy = int(nh * i / 5)
            sd.line([(0, yy + rnd.randint(-6, 6)), (o.width, yy + rnd.randint(-6, 6))], fill=int(120 * p), width=max(2, int(nh * 0.06)))
        sh = sh.filter(ImageFilter.GaussianBlur(4))
        dark = Image.new("RGBA", o.size, (0, 0, 0, 0))
        dark.putalpha(Image.fromarray(np.minimum(np.asarray(sh), np.asarray(o.getchannel("A")))))
        o.alpha_composite(dark)
        o = o.rotate(4 * p * (1 if seed % 2 else -1), resample=Image.BICUBIC, expand=True)
    return o


def vanish_fx(gt):
    img = Image.blend(bg("B1"), bg("B1", "night"), 0.3 * ease_out((gt - 4.4) / 1.2))
    puffs = []
    for name, x, feet, height, ts, side in KEEPERS:
        if gt < ts:
            place(img, name, "shock", x, feet, height, gt)
            continue
        S = CH.sprite(name, "shock")
        sc, hat, hat_bb, clo, collar, boots_y, boots = scaled_parts(name, height)
        pad_l = CH.PADS.get(name, (0, 0))[0]
        left = x - S.width * sc / 2 + pad_l * sc
        top = feet - boots.height
        tau = gt - ts
        p = min(1.0, (tau / FALL) ** 2)                      # gravity
        bounce = 0.06 * math.sin(min(1.0, max(0.0, (tau - FALL) / 0.18)) * math.pi) if tau > FALL else 0
        # shadow under the pile
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([left + 10, feet - 40, left + boots.width - 10, feet + 25], fill=(0, 0, 0, int(110 * p)))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
        # boots stay standing; clothes collapse down over the boot shafts, only toes poke out
        img.alpha_composite(boots, (int(left), int(top)))
        pile = crumple(clo, min(1.0, p * (1 + bounce)), hash(name) % 13, wf=1.4, hf=0.3)
        bottom0 = top + boots_y
        bottom1 = top + boots.height - (boots.height - boots_y) * 0.22
        bot = bottom0 + (bottom1 - bottom0) * p
        cx = left + boots.width / 2 + side * 18 * p
        _paste_clip(img, pile, int(cx - pile.width / 2), int(bot - pile.height))
        pile_top_final = bottom1 - clo.height * 0.3
        # cap tumbles down onto the pile
        th = gt - ts - 0.04
        q = min(1.0, (max(0.0, th) / (FALL + 0.1)) ** 2)
        hx0, hy0 = left + hat_bb[0], top + hat_bb[1]
        hy1 = pile_top_final - hat.height * 0.45
        rot = side * 28 * q
        hh = hat.rotate(rot, resample=Image.BICUBIC, expand=True)
        hx = hx0 + side * 30 * q - (hh.width - hat.width) / 2
        hy = hy0 + (hy1 - hy0) * q
        _paste_clip(img, hh, int(hx), int(hy))
        if tau < 0.4:
            puffs.append((left + boots.width / 2, top + collar - 0.55 * (collar), tau, name))
    # white puffs where the bodies were
    if puffs:
        lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for px, py, tau, name in puffs:
            rnd = random.Random(hash(name) % 1000)
            k = tau / 0.4
            for _ in range(18):
                ang = rnd.uniform(0, 2 * math.pi); dist = rnd.uniform(30, 150) * ease_out(k)
                r_ = rnd.uniform(14, 34) * (1 - 0.3 * k)
                cx_, cy_ = px + math.cos(ang) * dist, py + math.sin(ang) * dist * 0.8 + rnd.uniform(0, 120)
                d.ellipse([cx_ - r_, cy_ - r_, cx_ + r_, cy_ + r_], fill=(245, 245, 245, int(150 * (1 - k))))
        img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(6)))
    if 0 <= gt - 3.8 < 0.1:
        img = flash(img, int(110 * (1 - (gt - 3.8) / 0.1)))
    return img


# ---------------- extra atmosphere ----------------
_FOG = None


def fog(img, gt, alpha=70, speed=40):
    """Slow drifting fog/sea-mist layer."""
    global _FOG
    if _FOG is None:
        import numpy as np
        rnd = np.random.default_rng(3)
        n = Image.fromarray((rnd.random((24, 30)) * 255).astype("uint8")).resize((int(W * 1.6), H), Image.BICUBIC)
        n = n.filter(ImageFilter.GaussianBlur(40))
        _FOG = n
    x = int((gt * speed) % (W * 0.6))
    m = _FOG.crop((x, 0, x + W, H)).point(lambda v: int(max(0, v - 90) * alpha / 165))
    lay = Image.new("RGBA", img.size, (225, 230, 235, 0))
    lay.putalpha(m)
    return Image.alpha_composite(img, lay)


def pointing_hand(img, tip, t_in, gt, sleeve=(62, 48, 40)):
    """Cartoon pointing hand sliding in from the left edge (the reference's pointing inserts)."""
    if gt < t_in:
        return img
    k = ease_out((gt - t_in) / 0.3)
    tx, ty = tip
    shift = int((k - 1) * (tx + 60))
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    SK, LN = (226, 192, 160, 255), (18, 16, 14, 255)
    fx0 = tx - 150                                     # finger base
    d.rounded_rectangle([-40, ty - 20, fx0 - 120, ty + 150], 30, fill=sleeve + (255,), outline=LN, width=6)   # sleeve
    d.rounded_rectangle([fx0 - 160, ty - 10, fx0 + 10, ty + 140], 50, fill=SK, outline=LN, width=6)           # fist
    d.rounded_rectangle([fx0 - 20, ty - 4, tx, ty + 40], 22, fill=SK, outline=LN, width=6)                    # index finger
    for i in range(3):                                                                                       # curled fingers
        d.arc([fx0 - 70, ty + 40 + i * 30, fx0 + 10, ty + 80 + i * 30], 270, 90, fill=LN, width=5)
    d.arc([fx0 - 110, ty - 30, fx0 - 20, ty + 40], 200, 330, fill=LN, width=5)                                # thumb
    if shift:
        lay = lay.transform(lay.size, Image.AFFINE, (1, 0, -shift, 0, 1, 0))
    return Image.alpha_composite(img, lay)


def walkers(img, gt, t0, t1, pts, height, names=("C2", "C1", "C3"), spread=34):
    """Tiny figures walking along a path (the reference's tiny hikers on the aerial shot)."""
    k = max(0.0, min(1.0, (gt - t0) / (t1 - t0)))
    (x0, y0), (x1, y1) = pts
    for i, n in enumerate(names):
        x = x0 + (x1 - x0) * k + (i - 1) * spread
        y = y0 + (y1 - y0) * k + (i - 1) * 6 - abs(math.sin(gt * 10 + i)) * 3
        place(img, n, "neutral", x, y, height, gt)
    return img


_END = None


def ending_plate():
    """Callback: the opening island, with the three empty uniforms still lying there."""
    global _END
    if _END is None:
        _END = vanish_fx(5.6)
    return _END


# ---------------- the edit ----------------
NIGHT = set()


def SHOT(gt, f):
    """Returns (frame, is_day)."""
    # 1. hook: one keeper, then the other two slide in on "three"; shocked on "all three of you"
    if gt < 3.7:
        img = fog(bg("B1").copy(), gt, 45)
        e = expr_at([(0, "content"), (1.25, "neutral"), (3.3, "shock")], gt)
        (n2, x2, f2, h2, *_), (n3, x3, f3, h3, *_), (n1, x1, f1, h1, *_) = KEEPERS
        img = place(img, n2, e, x2, f2, h2, gt, enter="left", t_enter=0.75)
        img = place(img, n3, e, x3, f3, h3, gt, enter="right", t_enter=0.95)
        return place(img, n1, e, x1, f1, h1, gt), True
    # 2. "...vanish without a trace": bodies vanish, clothes drop
    if gt < 5.7:
        return fog(vanish_fx(gt), gt, 45), True
    # 3. "this actually happened in 1900" -> wide, keepers small, big date
    if gt < 7.95:
        img = fog(bg("B1").copy(), gt, 45)
        for nm, x in (("C2", 330), ("C1", 540), ("C3", 750)):
            img = place(img, nm, "neutral", x, 1700, 560, gt)
        return soft_text(img, "1900", W / 2, 520, 230, 7.05, 7.85, gt), True
    # 4. location, curved label, tiny keepers walking up to the lighthouse
    if gt < 11.2:
        img = walkers(bg("B2").copy(), gt, 7.95, 11.2, ((470, 905), (530, 815)), 58)
        return arc_text(fog(img, gt, 35), "\u201cFLANNAN ISLES\u201d", W / 2, 470, 900, 74, 8.3, 11.0, gt), True
    # 5. passing ship: sailor slides in, squints on "noticed", eyes wide on "strange"
    if gt < 14.2:
        e = expr_at([(0, "neutral"), (12.4, "suspicious"), (13.0, "shock")], gt)
        return place(bg("B4").copy(), "C8", e, 400, 2050, 1500, gt, enter="right", t_enter=11.35), False
    # 6. lighthouse dark
    if gt < 16.45:
        return rain(bg("B3").copy(), f, 140, 70), False
    # 7. storm, eleven days
    if gt < 20.15:
        img = rain(bg("B5").copy(), f, 320)
        if 0 <= gt - 17.0 < 0.15 or 0 <= gt - 18.4 < 0.12:
            img = flash(img)
        return soft_text(img, "11 DAYS", W / 2, 560, 120, 18.75, 20.0, gt), False
    # 8-9. relief keeper arrives at the landing: no flag, no signal, nothing
    if gt < 26.65:
        img = fog(bg("B6").copy(), gt, 55)
        e = expr_at([(0, "neutral"), (22.2, "worried"), (23.6, "suspicious"), (24.4, "worried"), (25.3, "scared")], gt)
        img = place(img, "C4", e, 300, 2020, 1350, gt, enter="left", t_enter=20.3)
        return marker(img, "circle", (450, 230, 640, 520), 23.65, gt, 1), True
    # 10. climbs up alone
    if gt < 28.55:
        img = fog(bg("B7").copy(), gt, 55)
        return place(img, "C4", "worried", 420, 1950, 900, gt, move=(26.65, 28.55, 520, 1650, 700), bob=10), True
    # 11. gate and door shut tight
    if gt < 30.95:
        e = expr_at([(0, "worried"), (29.75, "suspicious")], gt)
        return place(bg("B8").copy(), "C4", e, 250, 2050, 1500, gt, enter="left", t_enter=28.6), True
    # 12. beds empty: he leans in, confused
    if gt < 32.55:
        e = expr_at([(0, "neutral"), (31.6, "confused")], gt)
        return place(bg("B9").copy(), "C4", e, 220, 2250, 1650, gt, enter="left", t_enter=31.0), False
    # 13. clock stopped: shocked
    if gt < 33.85:
        img = marker(bg("B10").copy(), "circle", (140, 520, 720, 1360), 33.2, gt, 2)
        e = expr_at([(0, "worried"), (33.2, "shock")], gt)
        return place(img, "C4", e, 880, 2250, 1650, gt, enter="right", t_enter=32.6), False
    # 14. fireplace stone cold
    if gt < 36.25:
        e = expr_at([(0, "worried"), (35.2, "sad")], gt)
        return place(bg("B11").copy(), "C4", e, 170, 2250, 1600, gt, enter="left", t_enter=33.95), False
    # 15. "here's where it gets weird" -> close-up reaction, everyone shocked
    if gt < 38.25:
        img = bg("B1", "blur").copy()
        e = expr_at([(0, "suspicious"), (36.9, "deadpan"), (37.15, "shock")], gt)
        img = place(img, "C2", e, 120, 4300, 3900, gt)
        img = place(img, "C3", e, 980, 4300, 3900, gt)
        return place(img, "C1", e, 560, 4600, 4100, gt), True
    # 16. coats: two gone, one still there (pointing hand on "third")
    if gt < 43.25:
        img = bg("B12").copy()
        img = marker(img, "dashed", (150, 470, 345, 1250), 39.6, gt)
        img = marker(img, "dashed", (445, 470, 640, 1250), 39.8, gt)
        img = marker(img, "circle", (600, 360, 1040, 1700), 41.0, gt, 3)
        return pointing_hand(img, (610, 1050), 41.1, gt), True
    # 17. one man ran outside into the storm in just his shirt
    if gt < 47.75:
        e = expr_at([(0, "scared"), (45.65, "shock"), (46.0, "scared")], gt)
        img = place(bg("B13").copy(), "C5", e, 480, 1480, 640, gt, move=(43.35, 47.6, 520, 2150, 1700), bob=22)
        img = rain(img, f, 380, 110)
        return (flash(img, 140) if 0 <= gt - 45.65 < 0.15 else img), False
    # 18. bent railings, missing ropes 110 ft up: relief keeper looks on
    if gt < 54.05:
        img = fog(bg("B14").copy(), gt, 60, 55)
        img = marker(img, "circle", (560, 330, 1075, 800), 49.2, gt, 4)
        e = expr_at([(0, "worried"), (49.7, "scared"), (53.0, "shock")], gt)
        img = place(img, "C4", e, 820, 2300, 1350, gt, enter="right", t_enter=47.9)
        return soft_text(img, "110 FT", W / 2 - 160, 1100, 140, 51.8, 53.9, gt), True
    # 19. investigators slide in, arms crossed, smug, in front of the giant wave; grin on "giant wave"
    if gt < 55.95:
        e = expr_at([(0, "smug"), (55.1, "smugsmile")], gt)
        img = place(bg("B15").copy(), "C7", e, 760, 2000, 1450, gt, enter="right", t_enter=54.45)
        return place(img, "C6", e, 330, 2000, 1400, gt, enter="left", t_enter=54.1), True
    # 20. callback ending: the empty uniforms still lying on the island, fading to dusk
    img = fog(ending_plate().copy(), gt, 55)
    k = min(1.0, max(0.0, (gt - 56.4) / 1.8))
    return Image.alpha_composite(img, Image.new("RGBA", img.size, (0, 0, 10, int(120 * k)))), True


SHOT_STARTS = [0.0, 3.7, 5.7, 7.95, 11.2, 14.2, 16.45, 20.15, 26.65, 28.55, 30.95, 32.55, 33.85, 36.25, 38.25, 43.25, 47.75, 54.05, 55.95, DUR]


def camera(img, gt):
    """Slow push-in on every shot so nothing is ever frozen."""
    i = max(j for j, t in enumerate(SHOT_STARTS[:-1]) if t <= gt)
    s0, s1 = SHOT_STARTS[i], SHOT_STARTS[i + 1]
    z = 1 + 0.055 * (gt - s0) / (s1 - s0)
    if z <= 1.001:
        return img
    cw, ch = W / z, H / z
    x0, y0 = (W - cw) / 2, (H - ch) * 0.45
    return img.resize((W, H), Image.BILINEAR, box=(x0, y0, x0 + cw, y0 + ch))


def grade(img, day):
    """Reference look: bright, flat, desaturated daylight; night/storm scenes keep their mood."""
    img = ImageEnhance.Color(img).enhance(0.78 if day else 0.88)
    if day:
        img = ImageEnhance.Brightness(img).enhance(1.12)
        img = ImageEnhance.Contrast(img).enhance(0.94)
    return img


def caption(img, gt):
    cur = None
    for i, (w, s, e) in enumerate(WORDS):
        nxt = WORDS[i + 1][1] if i + 1 < len(WORDS) else e + 0.6
        if s - 0.02 <= gt < min(nxt, e + 0.6):
            cur = w
    if not cur:
        return img
    txt = cur.upper().strip(".,!?")
    if txt == "1900" and 7.05 <= gt < 7.95:
        return img
    f = font(F_CAP, 70)
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), txt, font=f, stroke_width=6)
    tw = bb[2] - bb[0]
    if tw > 1000:
        f = font(F_CAP, int(70 * 1000 / tw)); bb = d.textbbox((0, 0), txt, font=f, stroke_width=6); tw = bb[2] - bb[0]
    x, y = (W - tw) / 2 - bb[0], 185 - (bb[3] - bb[1]) / 2 - bb[1]
    d.text((x + 2, y + 4), txt, font=f, fill=(0, 0, 0, 110), stroke_width=6, stroke_fill=(0, 0, 0, 110))
    d.text((x, y), txt, font=f, fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(12, 12, 12, 255))
    return img


def frame(fi):
    gt = fi / FPS
    img, day = SHOT(gt, fi)
    img = grade(camera(img, gt).convert("RGB"), day).convert("RGBA")
    return caption(img, gt).convert("RGB")


def render_bytes(fi):
    return frame(fi).tobytes()


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--preview":
        os.makedirs(os.path.join(HERE, "previews"), exist_ok=True)
        for ts in sys.argv[2].split(","):
            frame(int(float(ts) * FPS)).save(os.path.join(HERE, "previews", f"p_{float(ts):05.1f}.jpg"), quality=85)
        sys.exit()
    n = int(DUR * FPS)
    out = os.path.join(HERE, "video_only.mp4")
    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for i, b in enumerate(pool.imap(render_bytes, range(n), chunksize=8)):
            ff.stdin.write(b)
            if i % 300 == 0:
                print("frame", i, "/", n, flush=True)
    ff.stdin.close(); ff.wait()
    print("done", out)
