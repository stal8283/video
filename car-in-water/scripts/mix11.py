"""Mix the ElevenLabs sound effects + music under the ElevenLabs narration, synced to word timings.
Inputs: public/voiceover.json, public/voiceover.wav, public/sfx11/*.mp3. Output: public/sfx.wav (stereo 44.1 kHz).
Usage: python3 scripts/mix11.py"""
import json, re, subprocess
import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
vo = json.load(open("public/voiceover.json"))
W = vo["words"]
DUR = vo["duration"] + 0.6
N = int(DUR * SR)
L = np.zeros(N)
R = np.zeros(N)
MUS = np.zeros((N, 2))

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
toks = [norm(w["text"]) for w in W]


def find(phrase, start=0):
    p = [norm(x) for x in phrase.split()]
    for i in range(start, len(toks)):
        if toks[i : i + len(p)] == p:
            return i
    raise SystemExit("anchor not found: " + phrase)


SI, S = {}, {}
c = 0
for sid, ph in [
    ("hook", "If your car"), ("driving", "Picture this."), ("truck", "Then a truck"), ("float", "The car slams"),
    ("phone", "So you do"), ("rising", "The dispatcher asks"), ("door", "Now you push"), ("wait", "Wait, what?"),
    ("minute", "You see,"), ("ambulance", "And the nearest"), ("rule", "That's why rescue"), ("glass", "And if the window"),
    ("escape", "Because 911"),
]:
    c = find(ph, c)
    SI[sid] = c
    S[sid] = W[c]["start"] - 0.07 if c else 0.0
order = list(S)
END = {k: (S[order[i + 1]] if i + 1 < len(order) else DUR) for i, k in enumerate(order)}


def at(phrase, scene):
    return W[find(phrase, SI[scene])]["start"]


_cache = {}


def load(name):
    if name not in _cache:
        pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", f"public/sfx11/{name}.mp3", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
        _cache[name] = np.frombuffer(pcm, np.float32).reshape(-1, 2).astype(np.float64)
    return _cache[name]


def fade(x, fi=0.05, fo=0.3):
    n = len(x)
    e = np.ones(n)
    a, b = int(fi * SR), int(fo * SR)
    if a:
        e[: min(a, n)] = np.linspace(0, 1, min(a, n))
    if b:
        e[max(0, n - b) :] *= np.linspace(1, 0, n - max(0, n - b))
    return x * e[:, None]


def loop(x, dur, xf=0.8):
    """seamless loop to `dur` seconds with crossfades"""
    need = int(dur * SR)
    k = int(xf * SR)
    out = x.copy()
    while len(out) < need:
        ramp = np.linspace(0, 1, k)[:, None]
        out = np.concatenate([out[:-k], out[-k:] * (1 - ramp) + x[:k] * ramp, x[k:]])
    return out[:need]


def place(x, t, gain=1.0, pan=0.0, bus=None):
    i = int(max(0, t) * SR)
    if i >= N:
        return
    x = x[: N - i] * gain
    lg, rg = np.sqrt((1 - pan) / 2) * 1.414, np.sqrt((1 + pan) / 2) * 1.414
    if bus is not None:
        bus[i : i + len(x), 0] += x[:, 0] * lg
        bus[i : i + len(x), 1] += x[:, 1] * rg
        return
    L[i : i + len(x)] += x[:, 0] * lg
    R[i : i + len(x)] += x[:, 1] * rg


def cue(name, t, gain=1.0, pan=0.0, fi=0.01, fo=0.15, dur=None):
    x = load(name)
    if dur:
        x = loop(x, dur) if len(x) < dur * SR else x[: int(dur * SR)]
    place(fade(x, fi, fo), t, gain, pan)


def lowpass(x, f):
    sos = signal.butter(4, f, fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi):
    sos = signal.butter(4, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


# ---------------------------------------------------------------- ambience beds
cue("rain_city", 0, 0.45, dur=END["hook"] + 0.4, fo=0.4)
cue("car_interior", S["driving"] - 0.1, 0.55, dur=END["driving"] - S["driving"] + 0.4, fi=0.2, fo=0.3)
cue("rain_city", S["truck"] - 0.1, 0.45, dur=END["float"] - S["truck"] + 0.3, fi=0.2, fo=0.5)
# muffled rain from inside the floating car
rain_in = lowpass(loop(load("rain_city"), END["door"] - S["phone"]), 900)
place(fade(rain_in, 0.3, 0.4), S["phone"], 0.5)
cue("underwater", S["rule"], 0.4, dur=END["glass"] - S["rule"], fi=0.3, fo=0.3)
cue("underwater", S["escape"], 0.6, dur=at("window", "escape") - S["escape"], fi=0.2, fo=0.2)
cue("rain_city", at("window", "escape") - 0.1, 0.35, dur=DUR - at("window", "escape"), fi=0.1, fo=0.5)

# ---------------------------------------------------------------- 1 hook: screech, fall, splash
ti = 0.15 + 1.38 / 0.72
cue("tire_screech", 0.0, 0.5, -0.3)
cue("fall_whoosh", 0.35, 0.7)
cue("car_splash", ti - 0.05, 0.85)

# ---------------------------------------------------------------- 3 truck: horn, crash, screech, rail break, whoosh
tc = at("clips", "truck")
tf = at("flying", "truck")
cue("truck_horn", tc - 0.9, 0.55, -0.4)
cue("rear_crash", tc - 0.03, 0.7)
cue("tire_screech", tc + 0.1, 0.55)
cue("rail_break", tf - 0.35, 0.45, 0.3)
cue("fall_whoosh", tf + 0.25, 0.35)

# ---------------------------------------------------------------- 4 float
cue("car_splash", at("slams", "float") - 0.05, 0.75)
cue("float_lap", at("floats", "float"), 0.6, dur=END["float"] - at("floats", "float") + 0.3, fi=0.3, fo=0.4)

# ---------------------------------------------------------------- 5 phone: dial + ringback
cue("phone_dial", at("dial", "phone") + 0.05, 0.75)
cue("phone_ring", at("911", "phone") + 0.6, 0.35, fo=0.3, dur=min(3.5, END["phone"] - at("911", "phone")))

# ---------------------------------------------------------------- 6 rising: dispatcher through the phone, water filling
disp = bandpass(load("dispatcher"), 350, 3400) * 1.6
place(fade(disp, 0.01, 0.1), S["rising"] + 0.05, 0.55, 0.35)
cue("water_fill", at("climbs", "rising") - 1.0, 0.65, dur=END["rising"] - at("climbs", "rising") + 1.4, fi=0.6, fo=0.5)
cue("metal_groan", S["rising"] + 1.2, 0.35)

# ---------------------------------------------------------------- 7 door: three shoves + groan
for ph in ["push", "won't", "Not"]:
    cue("door_shove", at(ph, "door") - 0.02, 0.8, -0.4)
cue("metal_groan", S["door"] + 0.4, 0.5, -0.3)

# ---------------------------------------------------------------- 8 wait: stinger
cue("stinger", S["wait"] - 0.1, 0.8)

# ---------------------------------------------------------------- 9 minute: ticking clock + pressure
ff = at("floats", "minute")
cue("clock_tick", ff - 0.2, 0.55, dur=at("minute", "minute") + 0.6 - ff + 0.2, fo=0.2)
cue("pressure_rumble", at("Once", "minute"), 0.6, dur=END["minute"] - at("Once", "minute"), fi=0.4, fo=0.4)
cue("metal_groan", at("pushes", "minute"), 0.55)

# ---------------------------------------------------------------- 10 ambulance: whoosh up + distant siren
cue("whoosh_up", S["ambulance"] - 0.15, 0.7)
cue("siren_far", S["ambulance"] + 0.3, 0.4, -0.5, dur=END["ambulance"] - S["ambulance"], fi=0.4, fo=0.6)

# ---------------------------------------------------------------- 11 rule: click, window, gush, splash, swoosh
cue("belt_click", at("Seatbelt", "rule") - 0.02, 0.9)
cue("window_down", at("Window", "rule") - 0.02, 0.85, -0.3)
cue("water_gush", at("Window", "rule") + 0.35, 0.55, -0.4, dur=END["rule"] - at("Window", "rule"), fo=0.5)
cue("small_splash", at("Kids", "rule") + 0.25, 0.6, -0.5)
cue("swoosh", at("Then", "rule") - 0.05, 0.6)

# ---------------------------------------------------------------- 12 glass: smash + gush, dull thunk on windshield
cue("swoosh", at("smash", "glass") - 0.3, 0.5)
cue("glass_smash", at("smash", "glass") + 0.05, 0.9, -0.3)
cue("water_gush", at("smash", "glass") + 0.3, 0.5, -0.4, dur=1.8)
cue("dull_thunk", at("built", "glass") - 0.02, 0.85)

# ---------------------------------------------------------------- 13 escape: whoosh up, surface gasp
bw = at("window", "escape")
cue("whoosh_up", bw - 0.9, 0.28)
cue("surface_gasp", bw - 0.25, 0.8)

# ---------------------------------------------------------------- transitions
for k in order[1:]:
    if k not in ("wait",):
        cue("swoosh", S[k] - 0.18, 0.28)

# ---------------------------------------------------------------- music: calm -> tense, cut for "Wait, what?"
calm = loop(load("music_calm"), S["rising"] + 1.5)
tense = loop(load("music_tense"), DUR - S["rising"] + 1.0)
place(fade(calm, 0.6, 1.5), 0, 0.5, bus=MUS)
place(fade(tense, 1.5, 1.5), S["rising"] - 0.5, 0.55, bus=MUS)
g = np.ones(N)
a, b = int((S["wait"] - 0.08) * SR), int((S["minute"] + 0.3) * SR)
g[a:b] = 0.05
g = signal.sosfilt(signal.butter(1, 20, fs=SR, output="sos"), g)  # soften the gate
MUS *= g[:, None]

# ---------------------------------------------------------------- duck effects + music under the narration
voc, vsr = sf.read("public/voiceover.wav")
if voc.ndim > 1:
    voc = voc.mean(1)
venv = np.abs(signal.resample_poly(voc, SR, vsr)) if vsr != SR else np.abs(voc)
venv = signal.sosfilt(signal.butter(2, 6, fs=SR, output="sos"), venv)
venv = np.clip(venv / max(1e-6, np.percentile(venv, 99)), 0, 1)
venv = np.pad(venv, (0, max(0, N - len(venv))))[:N]
L *= 1 - 0.55 * venv
R *= 1 - 0.55 * venv
MUS *= (1 - 0.5 * venv)[:, None]

mix = np.stack([L, R], 1) + MUS
mix = np.tanh(mix * 1.1) / 1.1
mix /= max(1e-6, np.abs(mix).max())
mix *= 0.7
sf.write("public/sfx.wav", mix.astype(np.float32), SR)
print(f"sfx.wav {DUR:.1f}s; scenes:", {k: round(v, 2) for k, v in S.items()})
