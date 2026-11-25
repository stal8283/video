"""Sound design in the reference's structure, from ElevenLabs-generated SFX (sfx/*.mp3).

Reference pattern: riser -> deep impact -> dark drone at the big turns (hook, the turn, the late reveal),
a lighter mystery bed in between, scene ambience and a few literal foley hits. Writes sfx.wav (stereo)."""
import os, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
DUR = 58.4
N = int(SR * (DUR + 0.5))
out = np.zeros((N, 2))


def load(name):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", os.path.join(HERE, "sfx", name + ".mp3"),
                          "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def db(x):
    return 10 ** (x / 20)


def put(name, at, gain_db=0.0, length=None, fade_in=0.01, fade_out=0.05, loop=False):
    s = load(name)
    if length is not None:
        L = int(length * SR)
        if loop:
            reps = int(np.ceil(L / len(s))) + 1
            # crossfade loop seams
            xf = int(0.8 * SR)
            seg = s.copy()
            for _ in range(reps):
                tail = seg[-xf:] * np.linspace(1, 0, xf)[:, None]
                head = s[:xf] * np.linspace(0, 1, xf)[:, None]
                seg = np.concatenate([seg[:-xf], tail + head, s[xf:]])
                if len(seg) >= L:
                    break
            s = seg
        s = s[:L]
    s = s.copy()
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    if fi > 0:
        s[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo > 0 and fo < len(s):
        s[-fo:] *= np.linspace(1, 0, fo)[:, None]
    i = int(at * SR)
    j = min(N, i + len(s))
    if j > i:
        out[i:j] += s[: j - i] * db(gain_db)


# --- music structure -------------------------------------------------------
put("bed", 0.0, -24, length=3.9, fade_in=0.3, fade_out=0.3)                   # light, curious open
put("riser", 3.8 - 2.4, -10, fade_out=0.02)                                  # into "vanish"
put("impact", 3.8, -4)
put("poof", 3.78, -9, fade_out=0.1)                                         # bodies vanish
for t_land in (4.30, 4.36, 4.48):                                            # clothes hit the ground
    put("clothdrop", t_land - 0.05, -9, fade_out=0.2)
put("drone", 3.8, -17, length=4.3, fade_out=1.0)                             # dark until the date card
put("bed", 7.9, -23, length=14.4, fade_in=0.6, fade_out=0.5, loop=True)      # mystery setup
put("riser", 22.2 - 2.4, -10, fade_out=0.02)                                 # into "nobody came down"
put("impact2", 22.2, -4)
put("drone", 22.2, -16, length=DUR - 22.2, fade_in=0.05, fade_out=2.0, loop=True)  # tension to the end
put("riser", 36.3 - 2.4, -9, fade_out=0.02)                                  # into "gets weird"
put("impact", 36.3, -3)
put("sting", 41.0, -12)                                                      # "the third was still hanging"
put("impact2", 55.4, -6)                                                     # giant wave
put("sting", 57.1, -13)                                                      # "ever found"

# --- ambience & foley ------------------------------------------------------
put("wind", 0.0, -26, length=3.75, fade_in=0.2, fade_out=0.05)
put("wind", 3.75, -22, length=1.95, fade_out=0.3)
put("wind", 5.7, -27, length=5.5, fade_out=0.4, loop=True)
put("horn", 11.4, -18, fade_out=0.6)
put("storm", 16.45, -16, length=3.7, fade_in=0.05, fade_out=0.3, loop=True)
put("thunder", 17.0, -9)
put("thunder", 18.4, -13)
put("wind", 20.15, -24, length=10.8, fade_out=0.4, loop=True)
put("door", 29.6, -10)
put("clock", 32.55, -10, length=1.3, fade_out=0.05)
put("storm", 43.25, -15, length=4.5, fade_in=0.05, fade_out=0.4, loop=True)
put("run", 43.35, -13, length=4.2, fade_out=0.3, loop=True)
put("thunder", 45.65, -8)
put("wind", 47.75, -23, length=6.3, fade_out=0.4, loop=True)
put("wave", 55.05, -7)
put("wind", 55.95, -26, length=2.5, fade_out=1.5)
for t in (0.75, 0.95, 11.35, 20.3, 28.6, 54.1, 54.45):                        # character slide-ins
    put("swoosh", t - 0.05, -16)

for t in (3.3, 12.4, 13.0, 22.2, 23.6, 24.4, 25.3, 29.75, 31.6, 33.2, 35.2, 37.15, 49.7, 53.0, 55.1):  # face changes
    put("pop", t - 0.02, -19)
put("swoosh", 41.05, -15)                                                    # pointing hand
for t in (31.0, 32.6, 33.95, 47.9):                                           # relief keeper steps in
    put("swoosh", t - 0.05, -17)
put("drone", 7.9, -24, length=14.3, fade_in=0.8, fade_out=0.5, loop=True)    # low bed under the setup too

peak = np.abs(out).max()
if peak > 0.98:
    out *= 0.98 / peak
pcm = (out * 32767).astype(np.int16)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "s16le", "-ac", "2", "-ar", str(SR), "-i", "-",
                os.path.join(HERE, "sfx.wav")], input=pcm.tobytes())
print("ok", round(float(peak), 3))
