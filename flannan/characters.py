"""Character sprites: green-screen cutout + full-head cartoon face (reference style).

Head boxes are in ORIGINAL Leonardo image coords (leo/C*.jpg, 768x1344): (x, y, w, h) of the real face,
hat_y = bottom edge of the hat brim (the real hat is laid back over the cartoon head), None = no hat."""
import json, os
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFilter
from faces import draw_face, random_identity, EXPR

HERE = os.path.dirname(os.path.abspath(__file__))
OFFS = json.load(open(os.path.join(HERE, "cut", "offsets.json")))

GREY = (196, 192, 184)
CHARS = {
    # the three keepers
    "C1": dict(box=(327, 180, 119, 115), hat_y=178, scale=1.8,
               ident=dict(skin=1, brow_col=3, wrinkles=2, beard=GREY, bags=1.1, nose="lines", eye_sz=0.95, long=1.04)),
    "C2": dict(box=(333, 166, 108, 112), hat_y=170, scale=1.8,
               ident=dict(skin=0, brow_col=1, wrinkles=0, nose="lines", eye_sz=1.08, wide=0.92, long=1.1, bags=0.7)),
    "C3": dict(box=(316, 200, 136, 128), hat_y=194, scale=1.75,
               ident=dict(skin=3, brow_col=0, wrinkles=1, mustache=True, nose="bulb", wide=1.04, long=1.0, jaw=1.0, eye_sz=0.9)),
    # relief keeper (Joseph Moore)
    "C4": dict(box=(333, 210, 113, 112), hat_y=210, scale=1.8,
               ident=dict(skin=2, brow_col=4, wrinkles=0, stubble=True, nose="hook", eye_sz=1.0, long=1.06)),
    # man in shirt (no hat: drawn hair)
    "C5": dict(box=(342, 222, 122, 135), hat_y=None, scale=1.8,
               ident=dict(skin=0, brow_col=0, hair=(70, 46, 24), stubble=True, nose="lines", eye_sz=1.05, long=1.06)),
    # investigators
    "C6": dict(box=(330, 205, 112, 122), hat_y=206, scale=1.75,
               ident=dict(skin=1, brow_col=1, mustache=True, nose="hook", wrinkles=1, eye_sz=0.95, long=1.08, wide=0.94)),
    "C7": dict(box=(333, 165, 108, 122), hat_y=168, scale=1.8,
               ident=dict(skin=4, brow_col=0, stubble=True, nose="lines", wrinkles=1, eye_sz=0.92, long=1.12, wide=0.9)),
    # sailor
    "C8": dict(box=(326, 112, 122, 210), hat_y=None, scale=1.75,
               ident=dict(skin=3, brow_col=4, hair=(96, 62, 34), stubble=True, nose="bulb", eye_sz=1.02, long=1.02)),
}
BASE_IDENT = dict(wide=1.0, long=1.04, jaw=0.4, skin=0, brow_col=0, brow_th=1.15, eye_sz=1.0, eye_gap=0.2, eye_y=0.4,
                  nose="lines", wrinkles=1, mustache=False, stubble=False, mole=False, bags=0.9, mouth_w=1.0)


def ident_for(name):
    i = dict(BASE_IDENT)
    i.update(CHARS[name]["ident"])
    return i


PADS = {}


@lru_cache(maxsize=64)
def sprite(name, expr):
    """Full-resolution RGBA sprite of character `name` with the cartoon head in expression `expr`."""
    c = CHARS[name]
    cut = Image.open(os.path.join(HERE, "cut", name + ".png")).convert("RGBA")
    ox, oy = OFFS[name][0], OFFS[name][1]
    x, y, w, h = c["box"]
    x, y = x - ox, y - oy
    ident = ident_for(name)
    W = w * c["scale"]
    face = draw_face(W, ident, dict(EXPR[expr]), hash(name) % 97)
    fx = int(x + w / 2 - face.width / 2)
    if c["hat_y"] is not None:  # tuck the top of the cartoon head under the hat brim
        fy = int(c["hat_y"] - oy - face.height * 0.13)
    else:
        fy = int(y + h * 0.5 - face.height / 2)
    # make room if the head pokes outside the cutout
    pad_l, pad_t = max(0, -fx), max(0, -fy)
    PADS[name] = (pad_l, pad_t)
    pad_r = max(0, fx + face.width - cut.width)
    if pad_l or pad_t or pad_r:
        big = Image.new("RGBA", (cut.width + pad_l + pad_r, cut.height + pad_t), (0, 0, 0, 0))
        big.paste(cut, (pad_l, pad_t))
        cut, fx, fy = big, fx + pad_l, fy + pad_t
        hat_y = (c["hat_y"] - oy + pad_t) if c["hat_y"] is not None else None
    else:
        hat_y = (c["hat_y"] - oy) if c["hat_y"] is not None else None
    out = cut.copy()
    out.alpha_composite(face, (fx, fy))
    if hat_y is not None:  # real hat back on top of the cartoon head
        m = Image.new("L", out.size, 0)
        ImageDraw.Draw(m).ellipse([fx - W * 0.2, hat_y - face.height * 2, fx + face.width + W * 0.2, hat_y], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(1.5))
        hat = Image.new("RGBA", out.size, (0, 0, 0, 0))
        hat.paste(cut, (0, 0), m)
        out.alpha_composite(hat)
    return out


def sprite_h(name, expr, height):
    s = sprite(name, expr)
    k = height / CHARS_H(name)
    return s.resize((max(1, int(s.width * k)), max(1, int(s.height * k))), Image.LANCZOS), k


def CHARS_H(name):
    """Height of the person (cutout without head padding) used for scaling."""
    o = OFFS[name]
    return o[3] - o[1]


if __name__ == "__main__":
    row = Image.new("RGBA", (2600, 900), (110, 120, 130, 255))
    x = 10
    for n in CHARS:
        s, k = sprite_h(n, "neutral", 860)
        row.alpha_composite(s, (x, 900 - s.height - 10))
        x += s.width + 10
    row.convert("RGB").save("/tmp/claude-0/-home-user-video/18fe20f0-4620-537c-b127-40cecd611e8a/scratchpad/chars.jpg")


@lru_cache(maxsize=16)
def clothes_parts(name):
    """Split the real cutout into (hat, clothes, boots) RGBA layers at cutout resolution, with the
    head, beard and hands removed - for the 'body vanishes, clothes drop' effect.
    Returns hat, clothes, boots, collar_y, boots_y (rows in cutout coords)."""
    import numpy as np
    c = CHARS[name]
    cut = Image.open(os.path.join(HERE, "cut", name + ".png")).convert("RGBA")
    a = np.asarray(cut).astype(np.float32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    oy = OFFS[name][1]
    H_, W_ = al.shape
    yy = np.mgrid[0:H_, 0:W_][0]
    x, y, w, h = c["box"]
    collar = int(y + h - oy + 16)
    hat_line = int(c["hat_y"] - oy) if c["hat_y"] is not None else 0
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    skin = (r > 90) & (g / (r + 1) > 0.6) & (g / (r + 1) < 0.95) & (b / (r + 1) > 0.42) & (b / (r + 1) < 0.88) & (r > b + 18)
    beard = (lum > 105) & ((np.max(a[..., :3], -1) - np.min(a[..., :3], -1)) < 40) & (yy < collar + 120)
    hat_m = yy < hat_line
    head_m = (yy >= hat_line) & (yy < collar)
    boots_y = int(H_ * 0.83)
    warm = (r > 70) & (r > b + 25) & ((r - b) < 95) & (g < r)   # hands (gold buttons have r-b > 100)
    pale = ((lum > 85) & (r >= b) & ((r - b) < 55)) | warm          # pale/old skin and grey beard (buttons are saturated)
    from scipy import ndimage
    cand = (skin | beard | pale) & (yy >= collar)
    lab, n = ndimage.label(cand)
    sizes = ndimage.sum(cand, lab, range(1, n + 1))
    big = np.isin(lab, np.nonzero(sizes > 500)[0] + 1)          # hands / beard, not buttons
    clothes_m = (yy >= collar) & (yy < boots_y) & ~big
    boots_m = yy >= boots_y

    def layer(m):
        out = a.copy()
        out[..., 3] = np.where(m, al, 0)
        return Image.fromarray(out.astype(np.uint8), "RGBA")
    # also drop soft fringe left around removed skin
    clothes_m = clothes_m & ~ndimage.binary_dilation(big, iterations=3)
    hat_m = hat_m & ~(skin | warm)
    return layer(hat_m), layer(clothes_m), layer(boots_m & ~skin), collar, boots_y
