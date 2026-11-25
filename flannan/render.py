"""Renders the Flannan Isles short (1080x1920, 30fps) as raw frames piped to ffmpeg.

Usage: python3 render.py [--preview T1,T2,...]   (preview writes stills to previews/)
"""
import json, math, random, subprocess, sys, os
from multiprocessing import Pool
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OW, OH = 1080, 1920          # output
CW, CH = 1242, 2208          # canvas (15% headroom for camera moves)
FPS = 30
DUR = 58.4
FONT_B = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FONT_XB = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"

WORDS = json.load(open(os.path.join(HERE, "words.json")))

# ---------- palette ----------
SKY_T, SKY_B = (6, 12, 24), (34, 56, 78)
SEA = (12, 28, 42)
ROCK = (38, 44, 46)
GRASS = (46, 64, 52)
WHITE = (228, 226, 216)
STRIPE = (150, 36, 36)
LAMP = (255, 222, 140)
NAVY = (34, 44, 74)
SKIN = (232, 198, 166)
YEL = (255, 214, 0)
RED = (230, 40, 40)


def font(path, size, _c={}):
    k = (path, size)
    if k not in _c:
        _c[k] = ImageFont.truetype(path, size)
    return _c[k]


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def lerp(a, b, x):
    return a + (b - a) * x


def gradient(top, bot, w=CW, h=CH):
    g = Image.new("RGB", (1, 256))
    for y in range(256):
        f = y / 255
        g.putpixel((0, y), tuple(int(lerp(top[i], bot[i], f)) for i in range(3)))
    return g.resize((w, h), Image.BILINEAR).convert("RGBA")


_GRAD = {}


def sky(top=SKY_T, bot=SKY_B):
    k = (top, bot)
    if k not in _GRAD:
        _GRAD[k] = gradient(top, bot)
    return _GRAD[k].copy()


def overlay(img, fn):
    """Draw with alpha onto img via a transparent layer."""
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fn(ImageDraw.Draw(lay))
    return Image.alpha_composite(img, lay)


# ---------- primitives ----------
def sea(img, top_y, t, color=SEA, amp=18, rough=1.0):
    d = ImageDraw.Draw(img)
    d.rectangle([0, top_y, CW, CH], fill=color + (255,))
    for k in range(7):
        y0 = top_y + 20 + k * k * 22
        a = amp * (1 + k * 0.5) * rough
        pts = [(x, y0 + a * math.sin(x / (90 + k * 30) + t * (1.4 + k * 0.3) + k)) for x in range(0, CW + 40, 30)]
        shade = tuple(min(255, c + 10 + k * 3) for c in color)
        d.line(pts, fill=shade + (255,), width=4 + k)
    return img


def rain(img, f, n=260, ang=0.25, alpha=110, length=70):
    rnd = random.Random(f * 7919)
    def fn(d):
        for _ in range(n):
            x, y = rnd.uniform(-200, CW), rnd.uniform(-100, CH)
            L = rnd.uniform(length * 0.6, length)
            d.line([(x, y), (x + L * ang, y + L)], fill=(200, 215, 230, alpha), width=2)
    return overlay(img, fn)


def island(img, cx, base_y, w, h, color=ROCK):
    d = ImageDraw.Draw(img)
    pts = [(cx - w / 2, base_y), (cx - w * 0.42, base_y - h * 0.7), (cx - w * 0.3, base_y - h * 0.95),
           (cx - w * 0.05, base_y - h), (cx + w * 0.25, base_y - h * 0.97), (cx + w * 0.4, base_y - h * 0.75),
           (cx + w / 2, base_y)]
    d.polygon(pts, fill=color + (255,))
    d.polygon([(cx - w * 0.3, base_y - h * 0.95), (cx - w * 0.05, base_y - h), (cx + w * 0.25, base_y - h * 0.97),
               (cx + w * 0.22, base_y - h * 0.9), (cx - w * 0.28, base_y - h * 0.88)], fill=GRASS + (255,))
    return base_y - h


def lighthouse(img, cx, base_y, h, lit=False, beam=0.0, t=0):
    d = ImageDraw.Draw(img)
    wb, wt = h * 0.22, h * 0.15
    bands = 5
    for i in range(bands):
        y0 = base_y - h * i / bands
        y1 = base_y - h * (i + 1) / bands
        w0 = lerp(wb, wt, i / bands) / 2
        w1 = lerp(wb, wt, (i + 1) / bands) / 2
        d.polygon([(cx - w0, y0), (cx + w0, y0), (cx + w1, y1), (cx - w1, y1)],
                  fill=(STRIPE if i % 2 else WHITE) + (255,))
    top = base_y - h
    gw = wt * 0.9
    d.rectangle([cx - gw * 0.7, top - h * 0.02, cx + gw * 0.7, top], fill=(30, 30, 30, 255))
    lamp_col = LAMP if lit else (40, 52, 60)
    d.rectangle([cx - gw / 2, top - h * 0.12, cx + gw / 2, top - h * 0.02], fill=lamp_col + (255,))
    for k in (-0.25, 0, 0.25):
        d.line([(cx + gw * k, top - h * 0.12), (cx + gw * k, top - h * 0.02)], fill=(20, 20, 20, 255), width=3)
    d.polygon([(cx - gw * 0.65, top - h * 0.12), (cx + gw * 0.65, top - h * 0.12), (cx, top - h * 0.2)],
              fill=(28, 28, 28, 255))
    lamp_y = top - h * 0.07
    if lit:
        def fn(dd):
            for side in (-1, 1):
                a = beam * side
                L = 1800
                dx, dy = math.cos(a) * side, math.sin(a) * 0.15
                tip = (cx + dx * L, lamp_y + dy * L)
                spread = 160
                dd.polygon([(cx, lamp_y), (tip[0], tip[1] - spread), (tip[0], tip[1] + spread)],
                           fill=LAMP + (60,))
            dd.ellipse([cx - 60, lamp_y - 60, cx + 60, lamp_y + 60], fill=LAMP + (90,))
        return overlay(img, fn), lamp_y
    return img, lamp_y


def keeper(img, x, feet, s=1.0, alpha=255, shirt=False, coat_col=NAVY, eyes=True, run=0.0, look=0):
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    H = 460 * s
    leg_w, leg_h = 34 * s, 140 * s
    sw = math.sin(run) * 28 * s
    d.rounded_rectangle([x - 44 * s + sw, feet - leg_h, x - 44 * s + leg_w + sw, feet], 10 * s, fill=(30, 30, 38, 255))
    d.rounded_rectangle([x + 10 * s - sw, feet - leg_h, x + 10 * s + leg_w - sw, feet], 10 * s, fill=(30, 30, 38, 255))
    body_col = (228, 228, 222) if shirt else coat_col
    bt = feet - H * 0.72
    d.rounded_rectangle([x - 70 * s, bt, x + 70 * s, feet - leg_h + 20 * s], 34 * s, fill=body_col + (255,))
    if not shirt:
        for k in range(3):
            yy = bt + 50 * s + k * 55 * s
            d.ellipse([x - 6 * s, yy, x + 6 * s, yy + 12 * s], fill=(210, 180, 60, 255))
    else:
        d.line([(x, bt + 10 * s), (x, feet - leg_h)], fill=(190, 190, 190, 255), width=int(3 * s) + 1)
    # arms
    arm_col = body_col
    d.rounded_rectangle([x - 96 * s, bt + 14 * s - sw * 0.5, x - 64 * s, bt + 190 * s - sw * 0.5], 16 * s, fill=arm_col + (255,))
    d.rounded_rectangle([x + 64 * s, bt + 14 * s + sw * 0.5, x + 96 * s, bt + 190 * s + sw * 0.5], 16 * s, fill=arm_col + (255,))
    # head
    hr = 74 * s
    hy = bt - hr * 0.95
    d.ellipse([x - hr, hy - hr, x + hr, hy + hr], fill=SKIN + (255,), outline=(120, 90, 70, 255), width=max(2, int(3 * s)))
    if eyes:
        for ex in (-26, 26):
            cx = x + ex * s
            d.ellipse([cx - 17 * s, hy - 14 * s, cx + 17 * s, hy + 14 * s], fill=(250, 250, 250, 255), outline=(40, 30, 30, 255), width=max(2, int(2 * s)))
            d.ellipse([cx - 5 * s + look * s, hy - 5 * s, cx + 5 * s + look * s, hy + 5 * s], fill=(15, 15, 15, 255))
        d.line([(x - 16 * s, hy + 38 * s), (x + 16 * s, hy + 38 * s)], fill=(90, 50, 40, 255), width=max(2, int(4 * s)))
    # cap
    if not shirt:
        d.rounded_rectangle([x - hr * 0.95, hy - hr * 1.05, x + hr * 0.95, hy - hr * 0.45], 14 * s, fill=(24, 30, 52, 255))
        d.rectangle([x - hr * 1.1, hy - hr * 0.55, x + hr * 0.4, hy - hr * 0.42], fill=(14, 16, 26, 255))
    else:
        d.chord([x - hr, hy - hr, x + hr, hy + hr * 0.2], 180, 360, fill=(60, 40, 30, 255))
    if alpha < 255:
        a = lay.getchannel("A").point(lambda v: v * alpha // 255)
        lay.putalpha(a)
    return Image.alpha_composite(img, lay)


def ship(img, x, y, s=1.0, lights=True, name=None):
    d = ImageDraw.Draw(img)
    d.polygon([(x - 260 * s, y), (x + 300 * s, y), (x + 230 * s, y + 80 * s), (x - 220 * s, y + 80 * s)], fill=(20, 22, 26, 255))
    d.rectangle([x - 120 * s, y - 70 * s, x + 120 * s, y], fill=(52, 56, 60, 255))
    d.rectangle([x - 20 * s, y - 170 * s, x + 30 * s, y - 70 * s], fill=(120, 30, 26, 255))
    d.rectangle([x - 20 * s, y - 170 * s, x + 30 * s, y - 150 * s], fill=(20, 20, 20, 255))
    d.line([(x - 200 * s, y), (x - 200 * s, y - 220 * s)], fill=(30, 30, 30, 255), width=int(6 * s))
    if lights:
        for k in range(4):
            xx = x - 100 * s + k * 60 * s
            d.rectangle([xx, y - 50 * s, xx + 22 * s, y - 30 * s], fill=LAMP + (255,))
    if name:
        d.text((x - 150 * s, y + 18 * s), name, font=font(FONT_XB, int(34 * s)), fill=(200, 200, 190, 255))


def dashed_outline(d, box, col, w=6, dash=26, rounded=False):
    x0, y0, x1, y1 = box
    edges = [((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))]
    for (ax, ay), (bx, by) in edges:
        L = math.hypot(bx - ax, by - ay)
        n = int(L // dash)
        for i in range(0, n, 2):
            f0, f1 = i / n, min(1, (i + 1) / n)
            d.line([(lerp(ax, bx, f0), lerp(ay, by, f0)), (lerp(ax, bx, f1), lerp(ay, by, f1))], fill=col, width=w)


def big_text(img, text, cy, size, col=(255, 255, 255), t_in=0.0, stroke=10, scale_pop=True):
    """Centered heavy text with pop-in; t_in = seconds since it appeared."""
    k = 1.0 + (0.35 * (1 - ease(t_in / 0.18)) if scale_pop else 0)
    f = font(FONT_B, int(size * k))
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    bb = d.textbbox((0, 0), text, font=f, stroke_width=stroke)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((img.width - w) / 2 - bb[0], cy - h / 2 - bb[1]), text, font=f, fill=col + (255,),
           stroke_width=stroke, stroke_fill=(0, 0, 0, 255))
    return Image.alpha_composite(img, lay)


# ---------- scenes: each returns a canvas-size RGBA image ----------
def sc_keepers(t, f, gt):
    img = sky((40, 58, 80), (120, 140, 150))
    img = sea(img, 1500, gt, color=(30, 50, 64), amp=10)
    island(img, CW / 2, 1560, 1700, 380, color=(70, 74, 72))
    img, _ = lighthouse(img, CW * 0.72, 1250, 760, lit=False)
    xs = [CW * 0.27, CW * 0.5, CW * 0.73]
    fades = [3.85, 4.2, 4.55]
    for i, x in enumerate(xs):
        a = 255
        if gt > fades[i]:
            a = int(255 * (1 - ease((gt - fades[i]) / 0.3)))
        if a > 0:
            jitter = 0 if gt < fades[i] else random.Random(f + i).uniform(-25, 25)
            img = keeper(img, x + jitter, 1900, 1.15, alpha=a, look=(i - 1) * 4)
    return img


def sc_island_wide(t, f, gt):
    img = sky()
    img = sea(img, 1250, gt)
    top = island(img, CW / 2, 1300, 900, 260)
    img, _ = lighthouse(img, CW * 0.52, top + 20, 300, lit=True, beam=gt * 1.5)
    return img


def sc_1900(t, f, gt):
    img = sky((4, 8, 16), (40, 50, 66))
    img = sea(img, 1650, gt, color=(10, 20, 30), amp=24)
    img, _ = lighthouse(img, CW / 2, 1700, 1250, lit=False)
    img = rain(img, f, n=160)
    if gt >= 7.1:
        img = big_text(img, "1900", CH * 0.42, 330, t_in=gt - 7.1)
    return img


def sc_map(t, f, gt):
    img = sky((10, 22, 36), (24, 44, 62))
    img = sea(img, 700, gt, color=(16, 36, 52), amp=6)
    d = ImageDraw.Draw(img)
    # stylised Scottish coastline on the right
    coast = [(CW, 300), (1040, 420), (980, 640), (1060, 820), (930, 1000), (990, 1250), (900, 1480), (1000, 1700),
             (960, 1950), (CW, 2208)]
    d.polygon(coast, fill=(44, 64, 54, 255))
    # outer hebrides
    d.polygon([(700, 900), (760, 860), (800, 1040), (760, 1300), (700, 1330), (690, 1120)], fill=(44, 64, 54, 255))
    # flannan isles dots
    for (x, y, r) in [(330, 1040, 26), (380, 1000, 14), (300, 1100, 12), (395, 1080, 10)]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=(70, 90, 76, 255))
    pulse = 1 + 0.15 * math.sin(gt * 8)
    img = overlay(img, lambda dd: dd.ellipse([330 - 90 * pulse, 1040 - 90 * pulse, 330 + 90 * pulse, 1040 + 90 * pulse],
                                             outline=RED + (255,), width=10))
    d = ImageDraw.Draw(img)
    if gt > 8.3:
        d.text((180, 1160), "FLANNAN ISLES", font=font(FONT_B, 78), fill=(255, 255, 255, 255), stroke_width=6, stroke_fill=(0, 0, 0, 255))
    if gt > 10.0:
        d.text((860, 560), "SCOTLAND", font=font(FONT_B, 64), fill=YEL + (255,), stroke_width=6, stroke_fill=(0, 0, 0, 255))
    return img


def sc_ship(t, f, gt):
    img = sky()
    img = sea(img, 1350, gt)
    top = island(img, CW * 0.78, 1380, 420, 150)
    img, _ = lighthouse(img, CW * 0.8, top + 10, 190, lit=False)
    x = lerp(-150, CW * 0.55, t / 3.0)
    ship(img, x, 1560, 1.25)
    if gt > 12.6:
        img = big_text(img, "?", 1130, 260, col=YEL, t_in=gt - 12.6, stroke=12)
    return img


def sc_dark(t, f, gt):
    img = sky((4, 8, 16), (22, 34, 50))
    lit = gt < 14.95 and int(gt * 12) % 3 != 0  # flickers then dies
    img, _ = lighthouse(img, CW / 2, CH + 600, 2400, lit=lit, beam=0.2)
    return img


def sc_storm(t, f, gt):
    img = sky((4, 6, 12), (30, 40, 52))
    img = sea(img, 1150, gt * 2.2, color=(14, 26, 36), amp=60, rough=1.6)
    top = island(img, CW / 2, 1250, 700, 220, color=(30, 34, 36))
    img, _ = lighthouse(img, CW / 2, top + 10, 260, lit=False)
    img = rain(img, f, n=420, ang=0.45, alpha=140, length=110)
    for lt in (17.0, 18.35):
        if 0 <= gt - lt < 0.18:
            img = Image.alpha_composite(img, Image.new("RGBA", img.size, (220, 230, 255, 150)))
    if gt > 18.75:
        n = min(11, 1 + int((gt - 18.75) / 0.06))
        img = big_text(img, f"DAY {n}", 820, 210, col=(YEL if n == 11 else (255, 255, 255)), t_in=0.5)
    return img


def sc_boat(t, f, gt):
    img = sky((30, 44, 60), (90, 104, 112))
    img = sea(img, 1350, gt, color=(24, 40, 52), amp=14)
    top = island(img, CW * 0.65, 1420, 1300, 520)
    img, _ = lighthouse(img, CW * 0.72, top + 10, 380, lit=False)
    x = lerp(80, CW * 0.38, ease(t / 2.0))
    ship(img, x, 1560, 1.1, lights=False, name="HESPERUS")
    return img


def sc_landing(t, f, gt):
    img = sky((40, 54, 70), (110, 122, 128))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 1500, CW, CH], fill=(24, 40, 52, 255))
    d.polygon([(0, 1500), (0, 400), (300, 300), (800, 420), (CW, 380), (CW, 1500)], fill=(56, 60, 60, 255))
    # steps
    for k in range(14):
        y = 1500 - k * 70
        x = 220 + k * 40
        d.rectangle([x, y - 18, x + 260, y], fill=(110, 108, 100, 255))
    # jetty
    d.rectangle([60, 1500, 700, 1540], fill=(84, 70, 56, 255))
    # flagpole, empty
    d.rectangle([900, 500, 914, 1180], fill=(200, 200, 200, 255))
    d.ellipse([893, 486, 921, 514], fill=(220, 220, 220, 255))
    if gt > 23.6:
        dd = ImageDraw.Draw(img)
        dashed_outline(dd, (914, 520, 1150, 680), RED + (255,), w=7)
        if 23.7 < gt < 24.4:
            img = big_text(img, "NO FLAG", 760, 110, col=RED, t_in=gt - 23.7, stroke=8)
    if gt > 24.4:
        d = ImageDraw.Draw(img)
        d.rectangle([520, 820, 600, 920], fill=(30, 30, 30, 255))
        d.ellipse([532, 836, 588, 892], fill=(60, 66, 70, 255))
        if gt < 25.25:
            img = big_text(img, "NO SIGNAL", 1060, 110, col=RED, t_in=gt - 24.4, stroke=8)
    img = sea(img, 1560, gt, color=(24, 40, 52), amp=8)
    return img


def sc_climb(t, f, gt):
    img = sky((40, 54, 70), (110, 122, 128))
    d = ImageDraw.Draw(img)
    d.polygon([(0, CH), (0, 900), (CW, 300), (CW, CH)], fill=(58, 62, 62, 255))
    for k in range(22):
        x = k * 70
        y = 2000 - k * 80
        d.rectangle([x, y - 20, x + 200, y], fill=(110, 108, 100, 255))
    p = 0.25 + 0.55 * t / 1.9
    x = p * 22 * 70 + 60
    y = 2000 - p * 22 * 80
    img = keeper(img, x, y - 10, 0.95, run=t * 9)
    return img


def sc_door(t, f, gt):
    img = gradient((90, 96, 100), (150, 150, 145))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, CW, CH], fill=(196, 192, 180, 255))
    for y in range(0, CH, 90):
        d.line([(0, y), (CW, y)], fill=(176, 172, 160, 255), width=3)
    d.rectangle([380, 700, 860, 1700], fill=(40, 60, 50, 255))
    d.rectangle([400, 720, 840, 1700], fill=(56, 84, 70, 255))
    d.ellipse([760, 1180, 800, 1220], fill=(200, 170, 60, 255))
    d.rectangle([0, 1700, CW, CH], fill=(110, 108, 100, 255))
    # gate in front
    for k in range(13):
        x = 60 + k * 95
        d.rectangle([x, 1380, x + 16, 2100], fill=(28, 28, 30, 255))
        d.polygon([(x - 6, 1380), (x + 22, 1380), (x + 8, 1340)], fill=(28, 28, 30, 255))
    d.rectangle([40, 1460, CW - 40, 1484], fill=(28, 28, 30, 255))
    d.rectangle([40, 1980, CW - 40, 2004], fill=(28, 28, 30, 255))
    img = keeper(img, 620, 2190, 1.0, eyes=True, look=0) if gt < 29.4 else img
    if gt > 29.75:
        img = big_text(img, "LOCKED", 560, 150, col=YEL, t_in=gt - 29.75)
    return img


def interior_bg():
    img = Image.new("RGBA", (CW, CH), (70, 50, 38, 255))
    d = ImageDraw.Draw(img)
    for x in range(0, CW, 110):
        d.line([(x, 0), (x, 1500)], fill=(56, 40, 30, 255), width=6)
    d.rectangle([0, 1500, CW, CH], fill=(48, 36, 28, 255))
    return img


def sc_beds(t, f, gt):
    img = interior_bg()
    d = ImageDraw.Draw(img)
    for k, x in enumerate((100, 720)):
        d.rectangle([x, 1300, x + 420, 1560], fill=(90, 66, 48, 255))
        d.rectangle([x + 10, 1220, x + 410, 1320], fill=(214, 210, 196, 255))
        d.rounded_rectangle([x + 20, 1180, x + 150, 1250], 20, fill=(240, 238, 230, 255))
        d.polygon([(x + 150, 1230), (x + 410, 1215), (x + 400, 1290), (x + 180, 1300)], fill=(140, 150, 170, 255))
    if gt > 32.0:
        img = big_text(img, "EMPTY", 900, 170, t_in=gt - 32.0)
    return img


def sc_clock(t, f, gt):
    img = interior_bg()
    d = ImageDraw.Draw(img)
    cx, cy, r = CW / 2, 1100, 420
    d.ellipse([cx - r - 30, cy - r - 30, cx + r + 30, cy + r + 30], fill=(90, 62, 40, 255))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(238, 232, 214, 255))
    for k in range(12):
        a = k / 12 * 2 * math.pi
        d.line([(cx + math.sin(a) * r * 0.85, cy - math.cos(a) * r * 0.85), (cx + math.sin(a) * r * 0.95, cy - math.cos(a) * r * 0.95)],
               fill=(30, 30, 30, 255), width=10)
    # second hand ticks until "stopped" (33.2) then freezes
    sec_t = min(gt, 33.2)
    sa = int((sec_t - 32.6) * 1) / 60 * 2 * math.pi + 0.6
    for a, L, w in ((2.2, 0.5, 18), (5.9, 0.75, 12)):
        d.line([(cx, cy), (cx + math.sin(a) * r * L, cy - math.cos(a) * r * L)], fill=(20, 20, 20, 255), width=w)
    d.line([(cx, cy), (cx + math.sin(sa) * r * 0.85, cy - math.cos(sa) * r * 0.85)], fill=RED + (255,), width=6)
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(20, 20, 20, 255))
    if gt > 33.2:
        img = big_text(img, "STOPPED", 1700, 150, col=RED, t_in=gt - 33.2)
    return img


def sc_fire(t, f, gt):
    img = interior_bg()
    d = ImageDraw.Draw(img)
    d.rectangle([220, 700, 1020, 1600], fill=(110, 104, 98, 255))
    d.rectangle([320, 1000, 920, 1600], fill=(20, 18, 18, 255))
    d.rectangle([180, 640, 1060, 720], fill=(80, 60, 44, 255))
    for k in range(5):
        d.rounded_rectangle([380 + k * 90, 1480 - (k % 2) * 20, 520 + k * 90, 1540], 20, fill=(90, 88, 86, 255))
    d.ellipse([360, 1520, 880, 1600], fill=(120, 118, 116, 255))
    # frost tint
    frost = Image.new("RGBA", img.size, (150, 190, 230, int(70 * ease((gt - 34.1) / 1.2))))
    img = Image.alpha_composite(img, frost)
    if gt > 34.8:
        img = big_text(img, "COLD", 1820, 180, col=(170, 220, 255), t_in=gt - 34.8)
    return img


def coat(d, x, y, s=1.0, col=(214, 170, 40)):
    d.polygon([(x - 30 * s, y), (x + 30 * s, y), (x + 120 * s, y + 120 * s), (x + 130 * s, y + 620 * s),
               (x - 130 * s, y + 620 * s), (x - 120 * s, y + 120 * s)], fill=col + (255,))
    d.line([(x, y + 40 * s), (x, y + 620 * s)], fill=(150, 110, 20, 255), width=int(6 * s))
    d.polygon([(x - 120 * s, y + 120 * s), (x - 200 * s, y + 520 * s), (x - 140 * s, y + 540 * s), (x - 90 * s, y + 220 * s)], fill=col + (255,))
    d.polygon([(x + 120 * s, y + 120 * s), (x + 200 * s, y + 520 * s), (x + 140 * s, y + 540 * s), (x + 90 * s, y + 220 * s)], fill=col + (255,))


def sc_weird(t, f, gt):
    img = sc_hooks(t, f, 38.0)
    red = Image.new("RGBA", img.size, (140, 0, 0, 90 + int(40 * math.sin(gt * 20))))
    img = Image.alpha_composite(img, red)
    return img


def sc_hooks(t, f, gt):
    img = interior_bg()
    d = ImageDraw.Draw(img)
    d.rectangle([80, 820, CW - 80, 860], fill=(110, 80, 56, 255))
    xs = [260, 620, 980]
    for x in xs:
        d.rectangle([x - 10, 860, x + 10, 900], fill=(30, 30, 30, 255))
        d.arc([x - 30, 870, x + 30, 940], 0, 180, fill=(30, 30, 30, 255), width=10)
    coat(d, xs[2], 930, 0.85)
    if gt > 39.4:
        on = gt < 40.0 or int(gt * 6) % 2 == 0
        if on:
            for x in xs[:2]:
                dashed_outline(d, (x - 150, 930, x + 150, 1460), (255, 255, 255, 220), w=6)
        if 40.0 < gt < 41.0:
            img = big_text(img, "GONE", 1640, 170, t_in=gt - 40.0)
    if gt > 41.0:
        img = overlay(img, lambda dd: dd.ellipse([xs[2] - 230, 830, xs[2] + 230, 1560], outline=RED + (255,), width=14))
        d = ImageDraw.Draw(img)
        if gt > 41.4:
            img = big_text(img, "STILL HERE", 1660, 140, col=YEL, t_in=gt - 41.4)
    return img


def sc_run(t, f, gt):
    img = sky((6, 10, 18), (30, 40, 52))
    img = sea(img, 1500, gt * 2, color=(12, 22, 30), amp=40, rough=1.4)
    d = ImageDraw.Draw(img)
    d.polygon([(0, 1600), (CW, 1450), (CW, CH), (0, CH)], fill=(40, 44, 44, 255))
    d.rectangle([60, 900, 420, 1620], fill=(196, 192, 180, 255))
    d.rectangle([150, 1150, 330, 1620], fill=(14, 14, 14, 255))
    x = lerp(240, 900, ease(t / 4.3))
    img = keeper(img, x, 1700 - (x - 240) * 0.13, 1.1, shirt=True, run=t * 14, look=6)
    img = rain(img, f, n=480, ang=0.55, alpha=150, length=120)
    if 0 <= gt - 45.65 < 0.2:
        img = Image.alpha_composite(img, Image.new("RGBA", img.size, (220, 230, 255, 160)))
    if gt > 46.8:
        img = big_text(img, "NO COAT", 1900, 170, col=YEL, t_in=gt - 46.8)
    return img


def sc_cliff(t, f, gt):
    img = sky((30, 40, 56), (90, 100, 110))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 1700, CW, CH], fill=(20, 36, 48, 255))
    d.polygon([(0, 1000), (760, 980), (820, 1200), (700, 1700), (0, 1700)], fill=(62, 64, 62, 255))
    # railing (bent after "bent")
    bend = ease((gt - 49.4) / 0.4) if gt > 49.4 else 0
    posts = [80, 230, 380, 530, 680]
    for i, x in enumerate(posts):
        lean = bend * (60 if i in (2, 3) else 15) * (1 if i != 4 else -1)
        d.line([(x, 980), (x + lean, 800)], fill=(30, 30, 30, 255), width=14)
    pts = [(x + bend * (60 if i in (2, 3) else 15) * (1 if i != 4 else -1), 810 + (bend * 90 if i in (2, 3) else 0))
           for i, x in enumerate(posts)]
    d.line(pts, fill=(30, 30, 30, 255), width=12)
    # missing rope box
    if gt > 50.5:
        dashed_outline(d, (360, 880, 620, 970), RED + (255,), w=7)
        d.text((350, 1010), "ROPES?", font=font(FONT_B, 64), fill=RED + (255,), stroke_width=5, stroke_fill=(0, 0, 0, 255))
    if gt > 51.5:
        p = ease((gt - 51.5) / 0.6)
        y1 = lerp(1700, 980, p)
        d.line([(960, 1700), (960, y1)], fill=YEL + (255,), width=10)
        d.polygon([(930, y1 + 30), (990, y1 + 30), (960, y1 - 10)], fill=YEL + (255,))
        if p > 0.7:
            img = big_text(img, "110 FT", 1380, 130, col=YEL, t_in=gt - 51.95, scale_pop=True)
    img = sea(img, 1700, gt, color=(20, 36, 48), amp=24)
    return img


def sc_wave(t, f, gt):
    img = sky((4, 6, 12), (26, 34, 44))
    img = sea(img, 1500, gt * 2, color=(10, 22, 32), amp=50, rough=1.5)
    top = island(img, CW * 0.5, 1560, 800, 300, color=(30, 34, 36))
    img, _ = lighthouse(img, CW * 0.5, top + 10, 320, lit=False)
    rise = ease(t / 1.6)
    d = ImageDraw.Draw(img)
    crest = lerp(1700, 500, rise)
    pts = [(-100, CH)] + [(x, crest + 260 * math.sin(x / 260 + 1.3) + (x / CW) * 300) for x in range(-100, CW + 120, 30)] + [(CW + 120, CH)]
    d.polygon(pts, fill=(18, 50, 70, 240))
    d.line(pts[1:-1], fill=(220, 236, 240, 255), width=26)
    img = rain(img, f, n=300, ang=0.5, alpha=120)
    return img


def sc_end(t, f, gt):
    img = sky((2, 4, 8), (16, 24, 34))
    img = sea(img, 1350, gt * 0.6, color=(8, 16, 24), amp=8)
    d = ImageDraw.Draw(img)
    for x in (CW * 0.27, CW * 0.5, CW * 0.73):
        dashed_outline(d, (x - 100, 900, x + 100, 1500), (255, 255, 255, 200), w=6)
        d.ellipse([x - 70, 740, x + 70, 880], outline=(255, 255, 255, 200), width=6)
    if gt > 56.65:
        img = big_text(img, "NEVER FOUND", 1750, 140, col=RED, t_in=gt - 56.65)
    return img


# (start_time, scene_fn, shots[(t, z0, z1, fx, fy)])  fx/fy = focus in canvas fraction
SCENES = [
    (0.0, sc_keepers, [(0.0, 1.0, 1.06, .5, .55), (1.55, 1.22, 1.28, .62, .45)]),
    (2.45, sc_island_wide, [(2.45, 1.0, 1.1, .5, .55)]),
    (3.7, sc_keepers, [(3.7, 1.05, 1.12, .5, .6)]),
    (5.7, sc_1900, [(5.7, 1.0, 1.12, .5, .45), (7.05, 1.1, 1.16, .5, .42)]),
    (7.95, sc_map, [(7.95, 1.0, 1.08, .4, .5), (10.0, 1.05, 1.1, .55, .45)]),
    (11.2, sc_ship, [(11.2, 1.0, 1.06, .5, .6), (12.6, 1.1, 1.16, .55, .6)]),
    (14.2, sc_dark, [(14.2, 1.0, 1.15, .5, .5)]),
    (16.45, sc_storm, [(16.45, 1.0, 1.08, .5, .5), (18.7, 1.12, 1.18, .5, .45)]),
    (20.15, sc_boat, [(20.15, 1.0, 1.08, .45, .6)]),
    (22.15, sc_landing, [(22.15, 1.0, 1.05, .45, .55), (23.55, 1.25, 1.32, .75, .32), (24.35, 1.3, 1.36, .45, .4), (25.25, 1.0, 1.04, .5, .5)]),
    (26.65, sc_climb, [(26.65, 1.0, 1.1, .5, .55)]),
    (28.55, sc_door, [(28.55, 1.0, 1.06, .5, .6), (29.35, 1.2, 1.3, .5, .45)]),
    (30.95, sc_beds, [(30.95, 1.0, 1.08, .5, .6)]),
    (32.55, sc_clock, [(32.55, 1.0, 1.1, .5, .5), (33.15, 1.2, 1.24, .5, .5)]),
    (33.85, sc_fire, [(33.85, 1.0, 1.12, .5, .55)]),
    (36.25, sc_weird, [(36.25, 1.0, 1.35, .5, .5)]),
    (38.25, sc_hooks, [(38.25, 1.0, 1.05, .5, .5), (40.65, 1.15, 1.25, .75, .5)]),
    (43.25, sc_run, [(43.25, 1.0, 1.08, .5, .55), (45.55, 1.1, 1.18, .6, .55)]),
    (47.75, sc_cliff, [(47.75, 1.0, 1.06, .4, .5), (48.85, 1.25, 1.3, .3, .4), (50.5, 1.18, 1.22, .38, .45), (51.45, 1.0, 1.05, .55, .6)]),
    (54.05, sc_wave, [(54.05, 1.0, 1.12, .5, .55)]),
    (55.95, sc_end, [(55.95, 1.0, 1.08, .5, .55)]),
]
CUTS = sorted({s[0] for s in SCENES} | {sh[0] for s in SCENES for sh in s[2]})

HIGHLIGHT = {"VANISH", "1900", "DARK", "ELEVEN", "NOBODY", "NOTHING", "ALONE", "EMPTY", "STOPPED", "COLD", "WEIRD",
             "GONE", "THIRD", "SHIRT", "BENT", "VANISHED", "WAVE", "FOUND", "STRANGE", "TRACE", "STORM"}

_GRAIN = None


def grain():
    global _GRAIN
    if _GRAIN is None:
        rnd = random.Random(3)
        _GRAIN = []
        for i in range(6):
            g = Image.effect_noise((OW // 2, OH // 2), 40).resize((OW, OH)).convert("L")
            _GRAIN.append(Image.merge("RGBA", (g, g, g, Image.new("L", (OW, OH), 14))))
    return _GRAIN


_VIG = None


def vignette():
    global _VIG
    if _VIG is None:
        m = Image.new("L", (OW // 4, OH // 4), 0)
        d = ImageDraw.Draw(m)
        for i in range(60):
            a = int(200 * (1 - i / 60) ** 2)
            d.ellipse([-OW // 8 + i * 4, -OH // 8 + i * 6, OW // 4 + OW // 8 - i * 4, OH // 4 + OH // 8 - i * 6], outline=a, width=6)
        m = m.filter(ImageFilter.GaussianBlur(10)).resize((OW, OH))
        _VIG = Image.merge("RGBA", (Image.new("L", (OW, OH), 0),) * 3 + (m,))
    return _VIG


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
    col = YEL if txt in HIGHLIGHT else (255, 255, 255)
    k = 1.0 + 0.22 * (1 - ease((gt - s) / 0.09))
    f = font(FONT_B, int(96 * k))
    d = ImageDraw.Draw(img)
    bb = d.textbbox((0, 0), txt, font=f, stroke_width=9)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(((OW - tw) / 2 - bb[0], 300 - th / 2 - bb[1]), txt, font=f, fill=col + (255,), stroke_width=9, stroke_fill=(0, 0, 0, 255))
    return img


def frame(fi):
    gt = fi / FPS
    idx = max(i for i, s in enumerate(SCENES) if s[0] <= gt)
    st, fn, shots = SCENES[idx]
    t = gt - st
    img = fn(t, fi, gt)
    sh = max((s for s in shots if s[0] <= gt), key=lambda s: s[0])
    nxt = [s[0] for s in shots if s[0] > sh[0]] + [SCENES[idx + 1][0] if idx + 1 < len(SCENES) else DUR]
    span = max(0.1, min(nxt) - sh[0])
    p = (gt - sh[0]) / span
    z = lerp(sh[1], sh[2], p)
    z *= 1 + 0.05 * (1 - ease((gt - sh[0]) / 0.22))  # punch on cut
    if 36.25 <= gt < 38.25:                                # heartbeat shake on "weird"
        z *= 1 + 0.02 * abs(math.sin(gt * 9))
    cw, ch = CW / z, CH / z
    cx = min(max(sh[3] * CW, cw / 2), CW - cw / 2)
    cy = min(max(sh[4] * CH, ch / 2), CH - ch / 2)
    if any(0 <= gt - c < 0.12 for c in (7.1, 17.0, 18.35, 45.65, 55.4)):  # impact shake
        rr = random.Random(fi)
        cx += rr.uniform(-18, 18); cy += rr.uniform(-18, 18)
    img = img.crop((int(cx - cw / 2), int(cy - ch / 2), int(cx + cw / 2), int(cy + ch / 2))).resize((OW, OH), Image.BILINEAR)
    img = Image.alpha_composite(img, vignette())
    img = Image.alpha_composite(img, grain()[fi % 6])
    img = caption(img, gt)
    # flash-white transition on cuts
    for c in CUTS:
        if 0 <= gt - c < 0.05 and c > 0:
            img = Image.alpha_composite(img, Image.new("RGBA", img.size, (255, 255, 255, 60)))
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
