"""Tighten long pauses in the ElevenLabs narration and shift word timings to match.
Reads public/voiceover.mp3 + voiceover.json, writes public/voiceover.wav + updated json."""
import json, subprocess, numpy as np, soundfile as sf
SR = 44100
d = json.load(open("public/voiceover.json"))
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", "public/" + d["audio"], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(pcm, np.float32).copy()
W = d["words"]
keep_long = {"fine.": 0.6, "inch.": 0.6, "what?": 0.5}
cuts = []  # (start_s, remove_s)
for i in range(len(W) - 1):
    gap = W[i + 1]["start"] - W[i]["end"]
    mx = keep_long.get(W[i]["text"], 0.42)
    if gap > mx:
        rm = gap - mx
        cuts.append((W[i]["end"] + (gap - rm) / 2, rm))
out = []
pos = 0
for s, rm in cuts:
    i0, i1 = int(s * SR), int((s + rm) * SR)
    out.append(a[pos:i0])
    pos = i1
out.append(a[pos:])
b = np.concatenate(out)
def shift(t):
    return t - sum(rm for s, rm in cuts if s < t)
for w in W:
    w["start"], w["end"] = round(shift(w["start"]), 3), round(shift(w["end"]), 3)
sf.write("public/voiceover.wav", b, SR)
d["audio"] = "voiceover.wav"
d["duration"] = round(len(b) / SR + 0.8, 3)
json.dump(d, open("public/voiceover.json", "w"), indent=1)
print(f"removed {sum(r for _, r in cuts):.2f}s over {len(cuts)} pauses -> {len(b)/SR:.1f}s")
