"""Build the Short's voice track from the approved ElevenLabs segments (same takes as the 16:9 video),
with the long title/chapter pause closed. Writes public/vo/voice.wav (48 kHz mono, 0.15 s lead) and
vo/timings.json in the skill's format: {"words": [{"w", "t", "end", "spk"}]}."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
SRC = Path(sys.argv[1])          # ../ryugyong  (segments + segments.json)
OUT = Path(sys.argv[2])          # project folder
SR = 48000
segs = json.loads((SRC / "tools/segments.json").read_text())
GAP_OVERRIDE = {"n06": 0.5}      # the title + chapter card pause: dead air in a Short
def decode(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
out = [np.zeros(int(0.15 * SR), np.float32)]; t = 0.15; words = []; lines = []
for s in segs:
    a = decode(SRC / f"audio/segments/{s['id']}.mp3")
    al = json.loads((SRC / f"audio/segments/{s['id']}.align.json").read_text())
    ch, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    idx = [i for i, c in enumerate(ch) if c.strip() and c not in ".?!,"]
    t0 = max(0, st[idx[0]] - 0.04); t1 = min(len(a) / SR, en[len(ch) - 1] + 0.12)
    w = ""; ws = None
    for i, c in enumerate(ch + [" "]):
        if c == " ":
            if w: words.append({"w": w, "t": round(t + ws - t0, 3), "end": round(t + we - t0, 3), "spk": s["spk"], "seg": s["id"]})
            w = ""; ws = None
        else:
            if ws is None: ws = st[i]
            we = en[i]; w += c
    clip = a[int(t0 * SR):int(t1 * SR)]
    out.append(clip); t += len(clip) / SR
    g = GAP_OVERRIDE.get(s["id"], s["gap"]); out.append(np.zeros(int(g * SR), np.float32)); t += g
    lines.append(s["text"])
audio = np.concatenate(out)
pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
(OUT / "public/vo").mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "1", str(OUT / "public/vo/voice.wav")], input=pcm, check=True)
(OUT / "vo").mkdir(exist_ok=True)
(OUT / "vo/timings.json").write_text(json.dumps({"words": words}, indent=1))
(OUT / "vo/script.txt").write_text("\n".join(lines) + "\n")
print(f"{len(words)} words, last word ends {words[-1]['end']:.2f} s, audio {len(audio)/SR:.2f} s")
print(" ".join(f"{w['w']}@{w['t']:.2f}" for w in words[:12]))
