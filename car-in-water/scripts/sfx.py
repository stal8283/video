"""Procedural sound design + music bed, synced to the narration's word timings.
Every sound is synthesised here (no samples). Writes public/sfx.wav (stereo, 44.1 kHz).
Usage: python3 scripts/sfx.py"""
import json, re
import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
rng = np.random.default_rng(7)
vo = json.load(open("public/voiceover.json"))
W = vo["words"]
DUR = vo["duration"] + 0.5
N = int(DUR * SR)
L = np.zeros(N)
R = np.zeros(N)

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
toks = [norm(w["text"]) for w in W]
SI = {}


def find(phrase, start=0):
    p = [norm(x) for x in phrase.split()]
    for i in range(start, len(toks)):
        if toks[i : i + len(p)] == p:
            return i
    raise SystemExit("anchor not found: " + phrase)


def at(phrase, scene=None):
    """time (s) where `phrase` is spoken, searching from the start of `scene`."""
    return W[find(phrase, SI.get(scene, 0))]["start"]


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def env(d, a=0.005, r=0.2, curve=3.0):
    t = t_arr(d)
    e = np.minimum(1, t / max(a, 1e-4)) * np.clip(1 - (t - (d - r)) / r, 0, 1) ** (1 if r <= 0 else 1)
    return e


def decay(d, k):
    return np.exp(-t_arr(d) * k)


def noise(d):
    return rng.standard_normal(int(d * SR))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def place(x, t, gain=1.0, pan=0.0):
    i = int(max(0, t) * SR)
    if i >= N:
        return
    x = x[: N - i] * gain
    L[i : i + len(x)] += x * np.sqrt((1 - pan) / 2) * 1.414
    R[i : i + len(x)] += x * np.sqrt((1 + pan) / 2) * 1.414


def tone(f, d, kind="sine"):
    n = int(d * SR)
    f = np.full(n, f) if np.isscalar(f) else np.resize(f, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if kind == "square":
        return np.sign(np.sin(ph))
    return np.sin(ph)


# ---------------------------------------------------------------- sound recipes
def whoosh(d=0.6, lo=300, hi=3000, up=True):
    x = noise(d)
    t = t_arr(d)
    fc = np.geomspace(lo, hi, len(t)) if up else np.geomspace(hi, lo, len(t))
    y = np.zeros_like(x)
    # time-varying bandpass via short blocks
    blk = 512
    for s in range(0, len(x), blk):
        f = fc[s]
        y[s : s + blk] = bp(x[s : s + blk + 0], max(60, f * 0.6), min(18000, f * 1.6), 1)[: len(x[s : s + blk])]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return y * e * 0.5


def splash(d=2.2, big=1.0):
    x = noise(d)
    body = lp(x, 2500) * decay(d, 2.2)
    hiss = hp(x, 3000) * decay(d, 4.0) * 0.6
    thump = tone(np.geomspace(90, 40, int(0.4 * SR)), 0.4) * decay(0.4, 9)
    drops = np.zeros(int(d * SR))
    for k in range(int(60 * big)):
        tt = abs(rng.normal(0.35, 0.4))
        if tt >= d - 0.1:
            continue
        f = rng.uniform(900, 3500)
        b = tone(np.geomspace(f, f * 1.8, int(0.05 * SR)), 0.05) * decay(0.05, 70)
        i = int(tt * SR)
        drops[i : i + len(b)] += b * rng.uniform(0.05, 0.2)
    out = body * 0.9 + hiss + drops
    out[: len(thump)] += thump * 1.2
    return out * big


def rain(d, heavy=1.0):
    x = noise(d)
    patter = hp(x, 1200) * 0.35 + bp(x, 300, 1200) * 0.25
    for k in range(int(d * 25 * heavy)):
        i = int(rng.uniform(0, d - 0.02) * SR)
        b = hp(noise(0.012), 2500) * decay(0.012, 300)
        patter[i : i + len(b)] += b * rng.uniform(0.1, 0.5)
    return patter * heavy


def engine(d, rpm=1.0):
    t = t_arr(d)
    f0 = 42 * rpm * (1 + 0.02 * np.sin(2 * np.pi * 0.7 * t))
    x = 0.6 * tone(f0, d, "saw") + 0.4 * tone(f0 * 2, d) + 0.2 * tone(f0 * 3.01, d)
    return lp(x, 400) * 0.5


def crash(d=1.6):
    x = noise(d)
    crunch = bp(x, 400, 6000) * decay(d, 3.5)
    metal = sum(tone(f, d) * decay(d, rng.uniform(2.5, 6)) * rng.uniform(0.1, 0.3) for f in [523, 811, 1247, 1999, 2711, 3601])
    thud = tone(np.geomspace(120, 35, int(0.5 * SR)), 0.5) * decay(0.5, 7)
    out = crunch + metal * 0.7
    out[: len(thud)] += thud * 1.5
    # secondary debris clanks
    for k in range(10):
        tt = rng.uniform(0.15, d - 0.3)
        b = bp(noise(0.08), 1500, 7000) * decay(0.08, 60)
        i = int(tt * SR)
        out[i : i + len(b)] += b * 0.5
    return out


def screech(d=0.9):
    t = t_arr(d)
    f = 2400 + 400 * np.sin(2 * np.pi * 7 * t) + rng.standard_normal(len(t)).cumsum() * 0.3
    x = tone(f, d, "saw") * 0.3 + bp(noise(d), 1500, 4000) * 0.6
    return lp(x, 5000) * np.minimum(1, t / 0.05) * np.clip((d - t) / 0.3, 0, 1) * 0.45


def horn(d=0.7):
    x = tone(277, d, "saw") + tone(349, d, "saw")
    return lp(x, 1800) * np.minimum(1, t_arr(d) / 0.02) * np.clip((d - t_arr(d)) / 0.05, 0, 1) * 0.35


def dtmf(digit, d=0.14):
    rows = {"1": 697, "9": 852}
    cols = {"1": 1209, "9": 1477}
    return (tone(rows[digit], d) + tone(cols[digit], d)) * 0.25 * np.clip((d - t_arr(d)) / 0.01, 0, 1)


def ringback(d=2.0):
    t = t_arr(d)
    return (tone(440, d) + tone(480, d)) * 0.12 * (t < 1.6)


def tick(d=0.04, f=3000):
    return bp(noise(d), f * 0.7, f * 1.4) * decay(d, 120) + tone(f * 0.5, d) * decay(d, 160) * 0.5


def thump(d=0.35, f=70):
    return tone(np.geomspace(f * 1.8, f, int(d * SR)), d) * decay(d, 10) + lp(noise(d), 300) * decay(d, 25) * 0.5


def creak(d=1.0):
    t = t_arr(d)
    f = 140 + 60 * np.sin(2 * np.pi * 1.3 * t) + 30 * np.sin(2 * np.pi * 9 * t)
    x = tone(f, d, "saw")
    am = (np.sin(2 * np.pi * 23 * t) > 0.3).astype(float)
    return bp(x * am, 200, 2500) * np.sin(np.pi * t / d) * 0.25


def boom(d=1.8):
    return tone(np.geomspace(70, 32, int(d * SR)), d) * decay(d, 2.2) * 1.0 + lp(noise(d), 200) * decay(d, 6) * 0.4


def siren(d=3.0):
    t = t_arr(d)
    f = 950 + 350 * np.sin(2 * np.pi * 0.55 * t)
    return lp(tone(f, d, "square") * 0.15 + tone(f, d) * 0.2, 2500) * np.minimum(1, t / 0.5) * np.clip((d - t) / 0.8, 0, 1)


def click(d=0.06):
    return hp(noise(d), 2000) * decay(d, 90) * 0.8 + tone(1800, d) * decay(d, 140) * 0.4


def motor(d=0.6):
    t = t_arr(d)
    return bp(tone(180 + 40 * t / d, d, "saw"), 150, 1500) * 0.18 * np.sin(np.pi * t / d)


def gush(d=2.5):
    x = noise(d)
    t = t_arr(d)
    return (lp(x, 1800) * 0.7 + bp(x, 2000, 5000) * 0.2) * np.minimum(1, t / 0.08) * np.clip((d - t) / 0.8, 0, 1) * 0.8


def shatter(d=1.4):
    x = hp(noise(d), 2500) * decay(d, 6)
    out = x * 0.8
    for k in range(70):
        tt = abs(rng.normal(0.1, 0.25))
        if tt > d - 0.1:
            continue
        f = rng.uniform(3000, 9000)
        b = tone(f, 0.06) * decay(0.06, 50)
        i = int(tt * SR)
        out[i : i + len(b)] += b * rng.uniform(0.05, 0.25)
    out[: int(0.3 * SR)] += thump(0.3, 90) * 0.8
    return out


def bubbles(d, density=12):
    out = np.zeros(int(d * SR))
    for k in range(int(d * density)):
        tt = rng.uniform(0, d - 0.1)
        f = rng.uniform(300, 1100)
        b = tone(np.geomspace(f, f * 2.2, int(0.07 * SR)), 0.07) * decay(0.07, 45)
        i = int(tt * SR)
        out[i : i + len(b)] += b * rng.uniform(0.05, 0.18)
    return out


def underwater(d):
    t = t_arr(d)
    return lp(noise(d), 220) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * t)) * 0.8


def gasp(d=0.5):
    t = t_arr(d)
    return bp(noise(d), 600, 3500) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5 * 0.45


def fade(x, fi=0.3, fo=0.5):
    t = np.arange(len(x)) / SR
    d = len(x) / SR
    return x * np.minimum(1, t / fi) * np.clip((d - t) / fo, 0, 1)


# ---------------------------------------------------------------- anchors (same phrases as src/script.ts)
S = {}
_c = 0
for sid, ph in [
    ("hook", "If your car"), ("driving", "Picture this."), ("truck", "Then a truck"), ("float", "The car slams"),
    ("phone", "So you do"), ("rising", "The dispatcher asks"), ("door", "Now you push"), ("wait", "Wait, what?"),
    ("minute", "You see,"), ("ambulance", "And the nearest"), ("rule", "That's why rescue"), ("glass", "And if the window"),
    ("escape", "Because 911"),
]:
    _c = find(ph, _c)
    SI[sid] = _c
    S[sid] = W[_c]["start"] - 0.07 if _c else 0.0
order = list(S.keys())
END = {k: (S[order[i + 1]] if i + 1 < len(order) else DUR) for i, k in enumerate(order)}

# --- ambience beds
place(fade(rain(END["hook"] + 0.3, 1.0)), 0, 0.5)
place(fade(rain(END["driving"] - S["driving"] + 0.3, 0.6) * 0.5 + engine(END["driving"] - S["driving"] + 0.3) * 0.8), S["driving"], 0.6)
place(fade(rain(END["float"] - S["truck"], 1.0)), S["truck"], 0.5)
place(fade(engine(END["truck"] - S["truck"], 1.4)), S["truck"], 0.35)
inside = lp(rain(END["door"] - S["phone"], 0.8), 900)
place(fade(inside, 0.4, 0.6), S["phone"], 0.6)
place(fade(underwater(END["wait"] - S["rising"]), 1.0, 0.4), S["rising"], 0.35)
place(fade(underwater(END["glass"] - S["rule"]), 0.3, 0.3), S["rule"], 0.45)

# --- 1 hook: tyre squeal, fall whoosh, splash
ti = S["hook"] + 0.15 + 1.38 / 0.72
place(screech(0.5), 0.0, 0.35, -0.3)
place(whoosh(1.7, 200, 1400), 0.25, 0.7)
place(splash(2.6, 1.2), ti, 1.0)

# --- 2 driving: wiper thunks + soft blinker-like ticks
for k in range(int((END["driving"] - S["driving"]) / 1.1)):
    place(thump(0.12, 160) * 0.3, S["driving"] + 0.4 + k * 1.1, 0.25, 0.2)

# --- 3 truck: horn, crash, screech, rail break, whoosh
tc = at("clips", "truck")
tf = at("flying", "truck")
place(horn(0.75), tc - 0.85, 0.55, -0.4)
place(crash(1.6), tc, 1.0)
place(screech(max(0.4, tf - tc)), tc + 0.05, 0.6)
place(crash(1.2) * 0.8, tf - 0.08, 0.8, 0.3)
place(whoosh(1.2, 300, 2500), tf, 0.6)

# --- 4 float: slam splash, gentle lapping, creak
place(splash(2.4, 1.0), at("slams", "float"), 1.0)
place(creak(1.2), at("floats", "float"), 0.5)
for k in range(5):
    place(lp(noise(0.6), 700) * np.sin(np.pi * t_arr(0.6) / 0.6) * 0.3, at("floats", "float") + 0.8 + k * 0.9, 0.5, rng.uniform(-0.5, 0.5))

# --- 5 phone: DTMF 9-1-1 then ringback
place(click(), at("grab", "phone"), 0.5)
f9 = at("911", "phone")
place(dtmf("9"), at("dial", "phone"), 0.9)
place(dtmf("1"), f9 + 0.08, 0.9)
place(dtmf("1"), f9 + 0.26, 0.9)
place(ringback(1.8), f9 + 0.55, 0.9)

# --- 6 rising: phone chirp, water gurgle rising
place(bubbles(END["rising"] - S["rising"], 7), S["rising"], 0.6)
place(fade(lp(noise(END["rising"] - at("climbs", "rising")), 500) * np.linspace(0.2, 1, int((END["rising"] - at("climbs", "rising")) * SR))), at("climbs", "rising"), 0.5)

# --- 7 door: three shoves + metal strain
for ph in ["push", "won't", "Not"]:
    place(thump(0.4, 65), at(ph), 1.0, -0.4)
place(creak(1.4), S["door"] + 0.3, 0.7, -0.4)

# --- 8 wait: stinger boom + record-scratch whoosh
place(whoosh(0.35, 3000, 400, up=False), S["wait"] - 0.05, 0.6)
place(boom(1.8), S["wait"], 0.9)

# --- 9 minute: stopwatch ticks during the sweep, pressure groan
ff = at("floats", "minute")
fm = at("minute", "minute")
for k in range(int((fm + 0.4 - ff) / 0.12)):
    place(tick(), ff + k * 0.12, 0.5 if k % 5 else 0.8, 0.2)
place(boom(1.2) * 0.6, fm, 0.6)
po = at("Once", "minute")
place(fade(lp(tone(np.geomspace(45, 70, int((END["minute"] - po) * SR)), END["minute"] - po, "saw"), 250), 0.5, 0.5), po, 0.5)
place(creak(1.6), at("pushes", "minute"), 0.6)

# --- 10 ambulance: riser + distant siren
place(whoosh(1.3, 200, 4000), S["ambulance"] - 0.1, 0.6)
place(lp(siren(END["ambulance"] - S["ambulance"]), 1800), S["ambulance"] + 0.4, 0.35, -0.6)

# --- 11 rule: belt click, window motor + gush, kid splash, swoosh
place(click(), at("Seatbelt", "rule"), 1.0)
place(click() * 0.6, at("Seatbelt", "rule") + 0.07, 1.0)
place(motor(0.7), at("Window", "rule"), 1.0, -0.3)
place(gush(END["rule"] - at("Window", "rule") + 0.2), at("Window", "rule") + 0.35, 0.6, -0.4)
place(splash(1.0, 0.5), at("Kids", "rule") + 0.3, 0.6, -0.5)
place(whoosh(0.6, 400, 2500), at("Then", "rule"), 0.6)

# --- 12 glass: swing whoosh, shatter, gush; dull clunk on the windshield
sm = at("smash", "glass")
place(whoosh(0.35, 600, 3000), sm - 0.35, 0.6)
place(shatter(1.5), sm + 0.1, 1.0, -0.3)
place(gush(1.8), sm + 0.25, 0.7, -0.4)
place(whoosh(0.4, 300, 2000), at("Never", "glass") - 0.2, 0.5)
place(thump(0.3, 110), at("built", "glass"), 0.9)
place(tick(0.05, 1800), at("built", "glass"), 0.9)

# --- 13 escape: bubbles, ascent whoosh, surface breach + gasp, open air
bw = at("window", "escape")
place(bubbles(bw - S["escape"], 20), S["escape"], 0.8)
place(whoosh(bw - S["escape"], 120, 1800), S["escape"] + 0.1, 0.5)
place(splash(1.6, 0.7), bw - 0.15, 0.9)
place(gasp(0.6), bw - 0.05, 0.7)
place(fade(rain(DUR - bw, 0.5), 0.2, 0.6), bw - 0.1, 0.4)

# --- soft whoosh on every scene change
for k in order[1:]:
    place(whoosh(0.45, 500, 3500) * 0.6, S[k] - 0.2, 0.35)

# ---------------------------------------------------------------- music bed (A minor tension, builds, drops at "Wait")
def pad(freqs, d):
    t = t_arr(d)
    x = sum(tone(f * (1 + 0.003 * k), d, "saw") for f in freqs for k in (-1, 1))
    x = lp(x, 900) * 0.05
    return x * np.minimum(1, t / 0.6) * np.clip((d - t) / 0.6, 0, 1)


chords = [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]]
bar = 2.4
music = np.zeros(N)
tt = 0.0
i = 0
while tt < DUR:
    p = pad(chords[i % 4], bar + 0.6)
    s = int(tt * SR)
    music[s : s + len(p)] += p[: N - s] if s < N else 0
    tt += bar
    i += 1
# pulse (8ths at 100 bpm) building over the video
pulse = np.zeros(N)
step = 60 / 100 / 2
k = 0
while k * step < DUR:
    tt = k * step
    root = chords[int(tt / bar) % 4][0] / 2
    b = tone(root, 0.18, "saw") * decay(0.18, 14)
    b = lp(b, 600)
    s = int(tt * SR)
    if s < N:
        pulse[s : s + len(b)] += b[: N - s] * (0.05 + 0.1 * tt / DUR)
    k += 1
music += pulse
# silence the music for the "Wait, what?" beat, then come back
wt = S["wait"]
g = np.ones(N)
a, b_ = int((wt - 0.05) * SR), int((S["minute"] + 0.4) * SR)
g[a:b_] = 0.1
music *= g
# duck under the voice
voc, vsr = sf.read("public/voiceover.wav")
venv = np.abs(signal.resample_poly(voc, SR, vsr))
venv = lp(venv, 8)
venv = venv / max(1e-6, venv.max())
venv = np.pad(venv, (0, max(0, N - len(venv))))[:N]
music *= 1 - 0.45 * np.clip(venv * 3, 0, 1)
place(music, 0, 0.9)

# ---------------------------------------------------------------- master
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 0.9) * 0.9  # soft limiter
mix /= max(1e-6, np.abs(mix).max())
mix *= 0.7
sf.write("public/sfx.wav", mix.astype(np.float32), SR)
print(f"sfx.wav {DUR:.1f}s, scenes:", {k: round(v, 2) for k, v in S.items()})
