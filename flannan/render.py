"""Flannan Isles short, reference style: photoreal AI plates + hand-drawn cartoon faces.
Renders 1080x1920 @30fps raw frames into ffmpeg.
Usage: python3 render.py [--preview T1,T2,...]"""
import json, math, random, subprocess, sys, os
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageEnhance, ImageFilter
from faces import paste_face

HERE = os.path.dirname(os.path.abspath(__file__))
OW, OH = 1080, 1920
CW, CH = 1242, 2208
FPS = 30
DUR = 58.4
FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
FONT_B = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
WORDS = json.load(open(os.path.join(HERE, "words.json")))

# source plates are 580x1015 with a watermark bottom-right and a thin border on top: crop to 9:16
SRC_CROP = (19, 12, 561, 975)

# real-face boxes in SOURCE pixel coords: (x, y, w, h), expression, seed, hat fraction, look
FACES = json.load(open(os.path.join(HERE, "faces.json")))


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, x):
    return a + (b - a) * x


_PLATES = {}


def plate(name):
    if name in _PLATES:
        return _PLATES[name]
    src = Image.open(os.path.join(HERE, "img", name + ".jpg")).convert("RGB")
    sw, sh = src.size
    k = sw / 580
    cx0, cy0, cx1, cy1 = [v * k for v in SRC_CROP]
    im = src.crop((int(cx0), int(cy0), int(cx1), int(cy1))).resize((CW, CH), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    # cold, slightly desaturated grade like the reference
    im = ImageEnhance.Color(im).enhance(0.82)
    im = ImageEnhance.Contrast(im).enhance(1.06)
    r, g, b = im.split()
    b = b.point(lambda v: min(255, int(v * 1.04 + 4)))
    r = r.point(lambda v: int(v * 0.97))
    im = Image.merge("RGB", (r, g, b)).convert("RGBA")
    sx = CW / (cx1 - cx0)
    sy = CH / (cy1 - cy0)
    for f in FACES.get(name, []):
        x, y, w, h = f["box"]
        box = ((x * k - cx0) * sx, (y * k - cy0) * sy, w * k * sx, h * k * sy)
        im = paste_face(im, box, f.get("expr", "worried"), f.get("seed", 0), hat=f.get("hat", 0.13),
                        look=tuple(f.get("look", (0, 0))), scale=f.get("scale", 1.6), yoff=f.get("yoff", 0.0),
                        hat_y=((f["hat_y"] * k - cy0) * sy) if "hat_y" in f else None)
    _PLATES[name] = im
    return im


def rain(img, f, n=260, ang=0.25, alpha=90, length=80):
    rnd = random.Random(f * 7919)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for _ in range(n):
        x, y = rnd.uniform(-200, img.width), rnd.uniform(-100, img.height)
        L = rnd.uniform(length * 0.6, length)
        d.line([(x, y), (x + L * ang, y + L)], fill=(210, 220, 235, alpha), width=2)
    return Image.alpha_composite(img, lay)


def flash(img, a=150):
    return Image.alpha_composite(img, Image.new("RGBA", img.size, (225, 232, 255, a)))


def tint(img, col, a):
    return Image.alpha_composite(img, Image.new("RGBA", img.size, col + (int(a),)))


# scene: (start, plate, shots[(t, z0, z1, fx, fy)], fx_list)
SCENES = [
    (0.0, "keepers3", [(0.0, 1.0, 1.05, .5, .45), (1.55, 1.45, 1.5, .52, .3)], []),
    (2.45, "island_aerial", [(2.45, 1.0, 1.1, .5, .5)], []),
    (3.7, "keepers3", [(3.7, 1.1, 1.18, .5, .4)], ["vanish"]),
    (5.7, "lighthouse_storm", [(5.7, 1.0, 1.1, .5, .45), (7.05, 1.12, 1.18, .5, .4)], ["rain", "1900"]),
    (7.95, "map", [(7.95, 1.0, 1.1, .45, .5), (10.0, 1.25, 1.3, .5, .45)], []),
    (11.2, "ship_night", [(11.2, 1.0, 1.06, .5, .5), (12.6, 1.45, 1.5, .55, .3)], []),
    (14.2, "lantern_dark", [(14.2, 1.0, 1.2, .5, .4)], ["darken"]),
    (16.45, "storm_waves", [(16.45, 1.0, 1.08, .5, .5), (18.7, 1.2, 1.26, .5, .45)], ["rain_heavy", "lightning"]),
    (20.15, "boat_arrives", [(20.15, 1.35, 1.5, .35, .72)], []),
    (22.15, "landing", [(22.15, 1.0, 1.05, .5, .5), (23.55, 1.45, 1.5, .75, .2), (24.35, 1.2, 1.26, .5, .45), (25.25, 1.0, 1.03, .5, .5)], []),
    (26.65, "climb", [(26.65, 1.1, 1.3, .4, .45)], []),
    (28.55, "door", [(28.55, 1.0, 1.05, .5, .5), (29.35, 1.35, 1.4, .3, .45)], []),
    (30.95, "beds", [(30.95, 1.0, 1.08, .5, .55)], []),
    (32.55, "clock", [(32.55, 1.0, 1.08, .5, .45), (33.15, 1.25, 1.28, .5, .45)], []),
    (33.85, "fireplace", [(33.85, 1.0, 1.12, .5, .55)], ["frost"]),
    (36.25, "shocked", [(36.25, 1.0, 1.4, .5, .35)], ["pulse"]),
    (38.25, "coats", [(38.25, 1.0, 1.05, .55, .45), (40.65, 1.35, 1.45, .62, .5)], []),
    (43.25, "running", [(43.25, 1.0, 1.08, .5, .5), (45.55, 1.2, 1.28, .5, .4)], ["rain_heavy", "lightning"]),
    (47.75, "railings", [(47.75, 1.0, 1.06, .5, .5), (48.85, 1.3, 1.35, .45, .45), (50.5, 1.15, 1.2, .55, .5), (51.45, 1.0, 1.05, .5, .6)], []),
    (54.05, "investigators", [(54.05, 1.15, 1.25, .5, .45)], []),
    (55.05, "giant_wave", [(55.05, 1.0, 1.15, .5, .5)], ["rain"]),
    (55.95, "empty_island", [(55.95, 1.0, 1.1, .5, .5)], ["fade_end"]),
]
CUTS = sorted({s[0] for s in SCENES} | {sh[0] for s in SCENES for sh in s[2]})
LIGHTNING = (17.0, 18.35, 45.65)
SHAKE = (7.1, 17.0, 18.35, 45.65, 55.4)


def caption(img, gt):
    cur = None
    for i, (w, s, e) in enumerate(WORDS):
        nxt = WORDS[i + 1][1] if i + 1 < len(WORDS) else e + 0.6
        if s - 0.02 <= gt < min(nxt, e + 0.6):
            cur = (w, s)
    if not cur:
        return img
    w, s = cur
    txt = w.upper().strip(".,!?")
    if txt == "1900" and gt < 7.95:
        return img  # the big date card replaces the caption, like "1959" in the reference
    k = 1.0 + 0.08 * (1 - ease((gt - s) / 0.08))
    f = ImageFont.truetype(FONT, int(124 * k))
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), txt, font=f, stroke_width=7)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    if tw > 980:  # shrink long words to fit
        f = ImageFont.truetype(FONT, int(124 * k * 980 / tw))
        bb = d.textbbox((0, 0), txt, font=f, stroke_width=7)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
    x, y = (OW - tw) / 2 - bb[0], 200 - th / 2 - bb[1]
    d.text((x + 3, y + 5), txt, font=f, fill=(0, 0, 0, 140), stroke_width=7, stroke_fill=(0, 0, 0, 140))
    d.text((x, y), txt, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(10, 10, 10, 255))
    return img


def big_date(img, gt):
    t = gt - 7.1
    k = 1.0 + 0.3 * (1 - ease(t / 0.15))
    f = ImageFont.truetype(FONT, int(190 * k))
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), "1900", font=f, stroke_width=9)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((OW - tw) / 2 - bb[0], 470 - th / 2 - bb[1]), "1900", font=f, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(10, 10, 10, 255))
    return img


_GRAIN = None


def grain(i):
    global _GRAIN
    if _GRAIN is None:
        _GRAIN = []
        for _ in range(6):
            g = Image.effect_noise((OW // 2, OH // 2), 38).resize((OW, OH)).convert("L")
            _GRAIN.append(Image.merge("RGBA", (g, g, g, Image.new("L", (OW, OH), 12))))
    return _GRAIN[i % 6]


_VIG = None


def vignette():
    global _VIG
    if _VIG is None:
        m = Image.new("L", (OW // 4, OH // 4), 0)
        d = ImageDraw.Draw(m)
        for i in range(60):
            d.ellipse([-OW // 8 + i * 4, -OH // 8 + i * 6, OW // 4 + OW // 8 - i * 4, OH // 4 + OH // 8 - i * 6], outline=int(170 * (1 - i / 60) ** 2), width=6)
        m = m.filter(ImageFilter.GaussianBlur(10)).resize((OW, OH))
        _VIG = Image.merge("RGBA", (Image.new("L", (OW, OH), 0),) * 3 + (m,))
    return _VIG


def frame(fi):
    gt = fi / FPS
    idx = max(i for i, s in enumerate(SCENES) if s[0] <= gt)
    st, pname, shots, fx = SCENES[idx]
    img = plate(pname).copy()
    if "vanish" in fx:  # keepers glitch out and the island is left empty
        p = ease((gt - 3.85) / 0.8)
        flick = gt > 3.85 and int(gt * 20) % 3 == 0 and p < 1
        img = Image.blend(img, plate("empty_island"), 1.0 if flick else p)
    if "darken" in fx:
        img = tint(img, (0, 0, 10), 120 * ease((gt - 14.8) / 0.6))
    if "frost" in fx:
        img = tint(img, (150, 190, 235), 55 * ease((gt - 34.1) / 1.2))
    if "pulse" in fx:
        img = tint(img, (120, 0, 0), 50 + 35 * abs(math.sin(gt * 4.5)))
    if "fade_end" in fx:
        img = tint(img, (0, 0, 0), 120 * ease((gt - 56.6) / 1.5))
    # camera
    sh = max((s for s in shots if s[0] <= gt), key=lambda s: s[0])
    nxt = [s[0] for s in shots if s[0] > sh[0]] + [SCENES[idx + 1][0] if idx + 1 < len(SCENES) else DUR]
    p = (gt - sh[0]) / max(0.1, min(nxt) - sh[0])
    z = lerp(sh[1], sh[2], p) * (1 + 0.04 * (1 - ease((gt - sh[0]) / 0.2)))
    cw, ch = CW / z, CH / z
    cx = min(max(sh[3] * CW, cw / 2), CW - cw / 2)
    cy = min(max(sh[4] * CH, ch / 2), CH - ch / 2)
    if any(0 <= gt - c < 0.14 for c in SHAKE):
        rr = random.Random(fi)
        cx = min(max(cx + rr.uniform(-16, 16), cw / 2), CW - cw / 2)
        cy = min(max(cy + rr.uniform(-16, 16), ch / 2), CH - ch / 2)
    img = img.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx - cw / 2) + int(cw), int(cy - ch / 2) + int(ch))).resize((OW, OH), Image.BILINEAR)
    if "rain" in fx:
        img = rain(img, fi, n=160)
    if "rain_heavy" in fx:
        img = rain(img, fi, n=380, ang=0.45, alpha=120, length=110)
    if "lightning" in fx and any(0 <= gt - lt < 0.16 for lt in LIGHTNING):
        img = flash(img)
    img = Image.alpha_composite(img, vignette())
    img = Image.alpha_composite(img, grain(fi))
    if "1900" in fx and gt >= 7.1:
        img = big_date(img, gt)
    img = caption(img, gt)
    return img.convert("RGB")


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
    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}",
                           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
                           "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    with Pool(4) as pool:
        for i, b in enumerate(pool.imap(render_bytes, range(n), chunksize=8)):
            ff.stdin.write(b)
            if i % 300 == 0:
                print("frame", i, "/", n, flush=True)
    ff.stdin.close(); ff.wait()
    print("done", out)
