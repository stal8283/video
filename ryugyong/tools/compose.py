"""Original score for 'The Hotel That Has Never Had a Single Guest', composed in code.
96 bpm, D minor. Instruments are synthesized from scratch (marimba, pizzicato via Karplus-Strong,
glockenspiel, saw pad, sine bass, clock tick, low boom). The arrangement follows the voice-over timings,
so every musical change lands on a story beat.  Deterministic: same output every run.
"""
import json, os, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
T = json.load(open(f"{ROOT}/audio/timings.json"))
DUR = T["duration"]
N = int(DUR * SR) + SR
rng = np.random.default_rng(7)

def word(seg, w, nth=0):
    norm = lambda s: ''.join(c for c in s.lower() if c.isalnum() or c == "'")
    hits = [x for x in T["words"] if x["seg"] == seg and norm(x["word"]) == norm(w)]
    return hits[nth]["start"]

BPM = 96
BEAT = 60 / BPM
EIGHTH = BEAT / 2
BAR = BEAT * 4
mf = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# ------------------------------------------------------------------ instruments
def env_exp(n, rate):
    return np.exp(-np.arange(n) / SR * rate)

def marimba(f, dur=0.7, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) * env_exp(n, 7) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * env_exp(n, 18)
         + 0.08 * np.sin(2 * np.pi * f * 9.2 * t) * env_exp(n, 40))
    y[:80] *= np.linspace(0, 1, 80)
    return amp * y

def glock(f, dur=1.6, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) * env_exp(n, 2.6) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * env_exp(n, 5)
         + 0.15 * np.sin(2 * np.pi * f * 5.4 * t) * env_exp(n, 9))
    y[:40] *= np.linspace(0, 1, 40)
    return amp * y

def pluck(f, dur=0.5, amp=1.0, bright=0.5):
    n = int(dur * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p)
    # soften the excitation
    for _ in range(int(3 - bright * 2)):
        buf = 0.5 * (buf + np.roll(buf, 1))
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.994
    return amp * out * env_exp(n, 5)

def saw(f, n):
    t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 9))

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y

def pad(notes, dur, amp=1.0, att=0.8, rel=1.2, cutoff=1100):
    n = int(dur * SR)
    y = np.zeros(n)
    for m in notes:
        for d in (-0.08, 0.0, 0.08):
            y += saw(mf(m + d), n)
    y = lowpass(y / (len(notes) * 3), cutoff)
    e = np.ones(n)
    a = min(n, int(att * SR)); r = min(n, int(rel * SR))
    e[:a] = np.linspace(0, 1, a); e[n - r:] *= np.linspace(1, 0, r)
    return amp * y * e

def bass(f, dur=1.4, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    y = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env_exp(n, 2.2)
    y[:200] *= np.linspace(0, 1, 200)
    return amp * y

def tick(hi=True, amp=1.0):
    n = int(0.03 * SR); t = np.arange(n) / SR
    f = 2400 if hi else 1700
    y = np.sin(2 * np.pi * f * t) * env_exp(n, 220) + 0.3 * rng.uniform(-1, 1, n) * env_exp(n, 400)
    return amp * y

def boom(amp=1.0, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 70 * np.exp(-t * 1.2) + 38
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 2.0)
    return amp * y

# ------------------------------------------------------------------ mix buffer
L = np.zeros(N); R = np.zeros(N)
def put(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i]
    l = np.sqrt(0.5 * (1 - pan)); r = np.sqrt(0.5 * (1 + pan))
    L[i:i + len(sig)] += sig * l * gain; R[i:i + len(sig)] += sig * r * gain

# harmony
D2, A2 = 38, 45
MINOR = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb Gm A
MAJOR = [[46, 50, 53], [41, 45, 48], [48, 52, 55], [50, 53, 57]]   # Bb F C Dm
BASS_MIN = [38, 34, 43, 33]; BASS_MAJ = [34, 41, 36, 38]
SCALE = [50, 52, 53, 55, 57, 58, 60, 62, 64, 65, 67, 69]          # D natural minor

# key story times
t_twist = word('n04', 'but'); t_lights = word('n04', 'lights')
t_title = 22.10; t_chapter = 23.62; t_race = word('n07', 'singapore')
t_money = word('n09', 'then'); t_glass = word('n11', 'by'); t_empty = word('n11', 'empty')
t_2012 = word('n12', 'in'); t_out = word('n12', 'out'); t_skit2 = word('s05', 'opening')
t_tonight = word('n13', 'tonight'); t_switch = word('n13', 'switch'); t_final = word('n14', 'and')

def sections(t):
    """which layers play at time t"""
    if t < 2.45: return dict(mar=0.8, tick=0.5, bass=0.7)
    if t < 4.6: return dict(tick=0.6, bass=0.5)                       # first card: thin out
    if t < t_twist: return dict(mar=0.8, tick=0.6, bass=0.7)
    if t < t_title - 0.05: return dict(mar=0.9, tick=0.6, bass=0.8, pizz=0.7, pad=0.5)
    if t < t_race: return {}                                          # title hit + chapter handled separately
    if t < t_money - 0.05: return dict(mar=1.0, tick=0.7, bass=0.9, pizz=0.9, major=1)
    if t < t_glass: return dict(drone=1)
    if t < t_empty: return dict(mar=0.7, tick=0.4, glk=0.6, bass=0.6)
    if t < t_2012: return {}                                          # "Empty box." - music stops
    if t < t_out: return dict(pizz=0.8, mar=0.6, bass=0.7, major=1)
    if t < t_tonight: return dict(tick=0.9)                           # skit 2: only the clock. "Soon."
    if t < t_final: return dict(pad=0.8, glk=0.9, bass=0.9, mar=0.6, swell=1)
    return {}

grid_end = DUR
k = 0
step = EIGHTH
t = 0.0
melody_i = 4
while t < grid_end:
    s = sections(t)
    bar = int(t / BAR); beat_in_bar = (t % BAR) / BEAT
    e8 = int(round((t % BAR) / EIGHTH)) % 8
    chords = MAJOR if s.get('major') else MINOR
    ch = chords[bar % 4]; bs = (BASS_MAJ if s.get('major') else BASS_MIN)[bar % 4]
    if 'tick' in s and e8 % 2 == 0:
        put(tick(hi=(e8 // 2) % 2 == 0), t, pan=0.3, gain=0.22 * s['tick'])
    if 'bass' in s and e8 == 0:
        put(bass(mf(bs)), t, gain=0.33 * s['bass'])
    if 'mar' in s:
        pat = [0, 2, 1, 2, 0, 2, 1, 2]
        if (e8 in (0, 3, 4, 6)) or (s['mar'] > 0.85 and e8 in (1, 7)):
            put(marimba(mf(ch[pat[e8]] + 12)), t, pan=-0.25, gain=0.32 * s['mar'])
    if 'pizz' in s and e8 in (0, 1, 3, 5, 6):
        melody_i = int(np.clip(melody_i + rng.choice([-2, -1, 1, 1, 2]), 0, len(SCALE) - 1))
        put(pluck(mf(SCALE[melody_i] + 12), bright=0.7), t, pan=0.35, gain=0.35 * s['pizz'])
    if 'glk' in s and e8 in (0, 3, 6):
        put(glock(mf(ch[(e8 // 3) % 3] + 24)), t, pan=0.15, gain=0.16 * s['glk'])
    if 'pad' in s and e8 == 0:
        put(pad([m + 12 for m in ch], BAR + 0.6, att=0.5, rel=0.8), t, gain=0.22 * s['pad'] * (1 + 0.6 * s.get('swell', 0) * min(1, (t - t_tonight) / 4)))
    t += step

# drone for "the money runs out" (one long held low Dm, slow single marimba notes)
put(pad([38, 45, 50], t_glass - t_money + 1.0, att=1.2, rel=1.2, cutoff=600), t_money, gain=0.35)
for i, m in enumerate([62, 60, 57, 53]):
    put(marimba(mf(m), dur=1.2), t_money + 1.2 + i * 1.8, pan=-0.2, gain=0.25)
# twist sparkle on "lights"
for i, m in enumerate([74, 77, 81, 86]):
    put(glock(mf(m)), t_lights + i * 0.09, pan=0.2 * (i - 1.5), gain=0.2)
# title hit + held chord through the chapter card
put(boom(), t_title, gain=0.7)
put(pad([50, 57, 62, 65], t_race - t_title, att=0.05, rel=1.4, cutoff=1600), t_title, gain=0.3)
put(glock(mf(74), dur=2.5), t_title, gain=0.25); put(glock(mf(81), dur=2.5), t_title + 0.3, gain=0.18)
put(bass(mf(38), dur=3.0), t_title, gain=0.45)
# hard stop on "Empty box." then a single low pluck
put(pluck(mf(38), dur=0.9, bright=0.2), t_empty + 0.05, gain=0.5)
# "pulls out": a falling pizzicato then silence until the clock
for i, m in enumerate([65, 62, 57, 50]):
    put(pluck(mf(m), bright=0.6), t_out + i * 0.12, pan=0.3, gain=0.35)
# finale: lights switch on - rising glock arpeggio, then resolved Dm(add9) under the last card
for i, m in enumerate([62, 65, 69, 74, 77, 81, 86]):
    put(glock(mf(m)), t_switch + i * 0.08, pan=0.25 * np.sin(i), gain=0.2)
put(pad([50, 57, 64, 65], DUR - t_final + 0.5, att=0.3, rel=2.0, cutoff=1300), t_final, gain=0.32)
put(bass(mf(38), dur=2.4), t_final, gain=0.45)
put(glock(mf(76), dur=2.4), t_final + 0.4, gain=0.18)

mix = np.stack([L, R], 1)[: int(DUR * SR)]
# gentle fade in/out, soft clip
fi = int(0.05 * SR); fo = int(1.2 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]; mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix = np.tanh(mix * 1.2) / 1.2
pcm = (mix / max(1e-6, np.abs(mix).max()) * 0.9 * 32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "loudnorm=I=-16:TP=-2:LRA=9", "-ar", str(SR), f"{ROOT}/audio/score.wav"], input=pcm, check=True)
print("score written", DUR)
