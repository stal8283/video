"""Synthesises music bed + SFX, timed to the cut list in render.py, and writes sfx.wav."""
import wave, numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import CUTS, DUR
SR = 44100
N = int(SR * (DUR + 0.5))
rng = np.random.default_rng(1)
t = np.arange(N) / SR
out = np.zeros(N)

def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y

def add(sig, at, gain):
    i = int(at * SR); j = min(N, i + len(sig)); out[i:j] += sig[: j - i] * gain

# drone: minor chord in low register, slow swell, cuts to near-silence on "weird" (36.3) then returns darker
env = np.clip(t / 3, 0, 1)
drone = sum(np.sin(2 * np.pi * f * t + np.sin(t * 0.3 + k)) / (k + 1) for k, f in enumerate([55, 65.4, 82.4, 110, 130.8]))
drone *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.1 * t) ** 2
duck = np.ones(N); w = (t > 36.2) & (t < 38.2); duck[w] = 0.15
out += drone * env * duck * 0.05
# pulse after the drop (tension heartbeat 38.3 -> 54)
for bt in np.arange(36.3, 54.0, 0.75):
    k = np.arange(int(0.25 * SR)) / SR
    add(np.sin(2 * np.pi * 50 * k) * np.exp(-k * 18), bt, 0.35)
# wind
wind = lp(rng.standard_normal(N), 0.02) * (0.6 + 0.4 * np.sin(t * 0.7))
storm = np.where(((t > 16.4) & (t < 20.2)) | ((t > 43.2) & (t < 47.8)) | ((t > 54) & (t < 56)), 2.5, 1.0)
out += wind * storm * 0.25

def whoosh(d=0.35):
    k = np.arange(int(d * SR)) / SR
    n = lp(rng.standard_normal(len(k)), 0.15)
    return n * np.sin(np.pi * k / d) ** 2

def boom(d=1.6):
    k = np.arange(int(d * SR)) / SR
    return (np.sin(2 * np.pi * (60 * np.exp(-k * 2)) * k) + 0.4 * lp(rng.standard_normal(len(k)), 0.05)) * np.exp(-k * 3)

for c in CUTS:
    if c > 0: add(whoosh(), c - 0.12, 0.18)
for b in (7.1, 25.3, 36.3, 41.0, 55.4, 57.2):
    add(boom(), b, 0.7)
for th in (17.0, 18.35, 45.65):
    add(boom(2.5) + lp(rng.standard_normal(int(2.5 * SR)), 0.3) * np.exp(-np.arange(int(2.5 * SR)) / SR * 2) * 0.6, th, 0.8)
# clock ticks from 32.6 until "stopped" 33.2 (plus earlier faint)
for tk in np.arange(31.6, 33.2, 0.5):
    k = np.arange(int(0.03 * SR)) / SR
    add(np.sin(2 * np.pi * 2400 * k) * np.exp(-k * 200), tk, 0.25)

out = np.tanh(out * 1.2) * 0.8
wave_out = wave.open("sfx.wav", "wb"); wave_out.setnchannels(1); wave_out.setsampwidth(2); wave_out.setframerate(SR)
wave_out.writeframes((out * 32767).astype(np.int16).tobytes()); wave_out.close()
print("ok")
