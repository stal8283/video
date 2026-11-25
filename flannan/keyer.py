"""Chroma-key the green-screen character images (leo/C*.jpg) into trimmed RGBA cutouts (cut/C*.png)."""
import glob, json, os
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "cut")


def key(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gdom = g - np.maximum(r, b)                     # how "green-screen" a pixel is
    ratio = (g + 1) / (np.maximum(r, b) + 1)
    soft = 1.0 - np.clip((gdom - 12) / (40 - 12), 0, 1)       # soft edge matte (bright green)
    # background = green-ish pixels CONNECTED to the image border (dark corners included),
    # so green-tinted dark clothing inside the figure is kept
    cand = (gdom > 15) & (ratio > 1.2)
    lab, n = ndimage.label(ndimage.binary_opening(cand, iterations=1))
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgm = np.isin(lab, border[border > 0])
    bgm = bgm | ndimage.binary_closing(np.pad(bgm, 4, mode="edge"), iterations=2)[4:-4, 4:-4]
    a = np.where(bgm, np.minimum(soft, 0.0), 1.0)
    # soft edges: within 2px of the background use the soft matte
    edge = ndimage.binary_dilation(bgm, iterations=2) & ~bgm
    a = np.where(edge, np.maximum(soft, 0.0), a)
    # fill holes inside the figure
    a = np.where(ndimage.binary_fill_holes(a > 0.5) & (a < 0.5) & ~edge, 1.0, a)
    a = np.where(gdom > 35, 0.0, a)  # enclosed gaps of pure screen green (e.g. between arm and body)
    m = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(m).astype(np.float32) / 255
    # despill: pull green down to the other channels wherever green dominates
    g2 = np.where(g > np.maximum(r, b), np.maximum(r, b) + (g - np.maximum(r, b)) * 0.15, g)
    rgb = np.stack([r, g2, b], -1).clip(0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])
    out = Image.fromarray(rgba, "RGBA")
    bb = out.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    return out.crop(bb), bb


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    offs = {}
    for p in sorted(glob.glob(os.path.join(HERE, "leo", "C*.jpg"))):
        c, bb = key(p)
        offs[os.path.basename(p)[:-4]] = bb
        c.save(os.path.join(OUT, os.path.basename(p).replace(".jpg", ".png")))
        print(os.path.basename(p), c.size)
    import json
    json.dump(offs, open(os.path.join(OUT, "offsets.json"), "w"), indent=1)
