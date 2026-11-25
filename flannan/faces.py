"""Hand-drawn style cartoon faces (reference look) + compositing onto photo plates."""
import math, random
from PIL import Image, ImageDraw, ImageFilter

SKIN = (216, 186, 158)
LINE = (18, 16, 14)
BROW = (52, 32, 10)
BAG = (126, 116, 104)
WHITE = (255, 255, 255)


def wob(pts, rnd, amt):
    return [(x + rnd.uniform(-amt, amt), y + rnd.uniform(-amt, amt)) for x, y in pts]


def curve(cx, cy, rx, ry, a0, a1, n=24):
    return [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def stroke(d, pts, w, col=LINE):
    d.line(pts, fill=col + (255,), width=int(w), joint="curve")
    r = w / 2
    for x, y in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,))


def face_image(W, expr="worried", seed=0, look=(0, 0), age=1.0):
    """Returns RGBA face of width W (height ~1.08W). expr: worried | shock | smug | scared"""
    S = 2  # supersample
    w, h = int(W * S), int(W * 1.08 * S)
    rnd = random.Random(seed)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lw = max(3, w * 0.022)
    # head shape: rounded, widest at cheeks, slightly flat top
    cx, cy = w / 2, h * 0.5
    pts = []
    for i in range(72):
        a = 2 * math.pi * i / 72
        rx = w * 0.47 * (1 + 0.03 * math.sin(a * 2 + seed))
        ry = h * 0.47
        x, y = math.cos(a) * rx, math.sin(a) * ry
        if y > 0:  # jaw slightly squarer
            x *= 1 - 0.08 * (y / ry) ** 3
        pts.append((cx + x, cy + y))
    d.polygon(pts, fill=SKIN + (255,))
    d.line(pts + [pts[0]], fill=LINE + (255,), width=int(lw * 1.25), joint="curve")
    # hair tufts at temples
    big = 1.15 if expr in ("shock", "scared") else 1.0
    ey = h * 0.39
    for side in (-1, 1):
        ex = cx + side * w * 0.2
        erx, ery = w * 0.115 * big, w * 0.085 * big
        if expr == "smug":
            ery *= 0.6
        # eye bag
        d.ellipse([ex - erx * 1.12, ey - ery * 0.5, ex + erx * 1.12, ey + ery * 1.55], fill=BAG + (170,))
        stroke(d, wob(curve(ex, ey + ery * 1.25, erx * 0.95, ery * 0.6, 20, 160, 12), rnd, lw * 0.15), lw * 0.45)
        # eye white
        d.ellipse([ex - erx, ey - ery, ex + erx, ey + ery], fill=WHITE + (255,), outline=LINE + (255,), width=int(lw * 1.05))
        pr = w * 0.016
        px, py = ex + look[0] * erx * 0.4, ey + look[1] * ery * 0.4
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=LINE + (255,))
        if expr == "smug":  # heavy lid
            d.rectangle([ex - erx - 2, ey - ery - 2, ex + erx + 2, ey - ery * 0.1], fill=SKIN + (255,))
            stroke(d, [(ex - erx, ey - ery * 0.1), (ex + erx, ey - ery * 0.1)], lw * 0.9)
        # brow
        by = ey - ery - h * 0.05
        if expr in ("worried", "scared"):
            inner, outer = by - h * 0.025, by + h * 0.005
        elif expr == "smug":
            inner, outer = by + h * 0.02, by - h * 0.005
        else:  # shock: raised
            inner, outer = by - h * 0.03, by - h * 0.03
        x_in, x_out = cx + side * w * 0.07, cx + side * w * 0.33
        bw = h * 0.05
        n = 10
        for k in range(n + 1):
            f = k / n
            bx = x_in + (x_out - x_in) * f
            byy = inner + (outer - inner) * f - math.sin(f * math.pi) * h * 0.012
            r = bw * (0.42 + 0.18 * math.sin(f * math.pi))
            d.ellipse([bx - r, byy - r + bw / 2, bx + r, byy + r + bw / 2], fill=BROW + (255,))
    # nose lines
    for side in (-1, 1):
        x0 = cx + side * w * 0.035
        stroke(d, wob([(x0, h * 0.42), (x0 + side * w * 0.005, h * 0.52), (x0 + side * w * 0.015, h * 0.6)], rnd, lw * 0.2), lw * 0.55)
        # nostril curls
        nx = cx + side * w * 0.07
        stroke(d, curve(nx, h * 0.62, w * 0.035, h * 0.012, 0 if side > 0 else 180, 180 if side > 0 else 0, 8)[:7], lw * 0.6)
    stroke(d, [(cx - w * 0.025, h * 0.635), (cx + w * 0.025, h * 0.635)], lw * 0.5)
    # wrinkles (age)
    if age > 0:
        for side in (-1, 1):
            stroke(d, wob([(cx + side * w * 0.2, h * 0.58), (cx + side * w * 0.22, h * 0.66), (cx + side * w * 0.19, h * 0.75)], rnd, lw * 0.3), lw * 0.4)
            stroke(d, wob([(cx + side * w * 0.33, h * 0.36), (cx + side * w * 0.37, h * 0.42)], rnd, lw * 0.3), lw * 0.35)
        stroke(d, wob([(cx - w * 0.015, h * 0.2), (cx - w * 0.005, h * 0.27)], rnd, lw * 0.2), lw * 0.4)
    # mouth
    my = h * 0.77
    if expr == "worried":
        top = curve(cx, my + h * 0.06, w * 0.13, h * 0.075, 195, 345)
        bot = curve(cx, my + h * 0.07, w * 0.115, h * 0.03, 345, 195)
        d.polygon(top + bot, fill=LINE + (255,))
        for px, py in (top[0], top[-1]):
            r = h * 0.017
            d.ellipse([px - r, py - r * 1.6, px + r, py + r * 0.4], fill=LINE + (255,))
    elif expr in ("shock", "scared"):
        d.ellipse([cx - w * 0.07, my - h * 0.05, cx + w * 0.07, my + h * 0.07], fill=LINE + (255,))
        d.ellipse([cx - w * 0.035, my + h * 0.025, cx + w * 0.035, my + h * 0.06], fill=(120, 40, 40, 255))
    else:  # smug smirk
        stroke(d, curve(cx + w * 0.02, my - h * 0.06, w * 0.13, h * 0.06, 30, 150), lw * 0.9)
    return img.resize((int(W), int(W * 1.08)), Image.LANCZOS)


def paste_face(plate, box, expr="worried", seed=0, hat=0.0, look=(0, 0), scale=1.45, yoff=0.0, alpha=255):
    """box = (x, y, w, h) of the real face in plate coords. hat = fraction of the cartoon face (from top)
    that the original hat/hair is restored over, so the hat sits on top like the reference."""
    x, y, bw, bh = box
    W = bw * scale
    f = face_image(W, expr, seed, look)
    fx = int(x + bw / 2 - W / 2)
    fy = int(y + bh * (0.55 + yoff) - f.height / 2)
    if alpha < 255:
        f.putalpha(f.getchannel("A").point(lambda v: v * alpha // 255))
    orig = plate.copy()
    plate.alpha_composite(f, (max(0, fx), max(0, fy)), (max(0, -fx), max(0, -fy)))
    if hat > 0:
        m = Image.new("L", plate.size, 0)
        md = ImageDraw.Draw(m)
        hy = fy + f.height * hat
        md.ellipse([fx - W * 0.1, hy - f.height * 1.2, fx + W * 1.1, hy], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(max(2, W * 0.008)))
        plate = Image.composite(orig, plate, m)
    return plate


if __name__ == "__main__":
    row = Image.new("RGBA", (1600, 460), (90, 100, 110, 255))
    for i, e in enumerate(["worried", "shock", "scared", "smug"]):
        row.alpha_composite(face_image(380, e, seed=i), (20 + i * 400, 20))
    row.convert("RGB").save("/tmp/claude-0/-home-user-video/18fe20f0-4620-537c-b127-40cecd611e8a/scratchpad/faces_test.png")
