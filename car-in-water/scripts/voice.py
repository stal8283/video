"""Generate the narration locally with the open-source Kokoro TTS model (no API key),
then derive word timings with faster-whisper. Writes public/voiceover.wav + public/voiceover.json.
Usage: python3 scripts/voice.py <kokoro_dir> [voice] [speed]"""
import sys, re, json, difflib
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

kdir = sys.argv[1]
voice = sys.argv[2] if len(sys.argv) > 2 else "am_michael"
speed = float(sys.argv[3]) if len(sys.argv) > 3 else 1.12
src = open("src/script.ts").read()
text = re.search(r"SCRIPT = `([\s\S]*?)`;", src).group(1)
# sentence chunks; pause after each depends on punctuation (short beats, longer after punchlines)
chunks = re.findall(r"[^.?!]+(?:\.\.\.|[.?!])+", text.replace("\n", " "))
k = Kokoro(f"{kdir}/kokoro-v1.0.onnx", f"{kdir}/voices-v1.0.bin")
SR = 24000
parts = [np.zeros(int(0.12 * SR), np.float32)]
for c in chunks:
    c = c.strip()
    say = c.replace("911", "nine one one").replace("Seatbelt", "Seat belt")
    audio, sr = k.create(say, voice=voice, speed=speed, lang="en-us")
    # trim leading/trailing silence
    idx = np.where(np.abs(audio) > 0.01)[0]
    audio = audio[max(0, idx[0] - 200): idx[-1] + 600]
    parts.append(audio.astype(np.float32))
    pause = 0.34 if c.endswith("?") or c.endswith("fine.") or c.endswith("inch.") else 0.24 if c.endswith(".") else 0.3
    if c.endswith("..."): pause = 0.3
    parts.append(np.zeros(int(pause * SR), np.float32))
wav = np.concatenate(parts)
wav = wav / max(1e-6, np.abs(wav).max()) * 0.89
sf.write("public/voiceover.wav", wav, SR)
dur = len(wav) / SR

# word timings via whisper, aligned to the script's own tokens
import subprocess
from faster_whisper import WhisperModel
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", "public/voiceover.wav", "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], capture_output=True, check=True).stdout
a16 = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a16, word_timestamps=True, initial_prompt=text.replace("\n", " "), language="en")
ww = [w for s_ in segs for w in s_.words]
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower())
tokens = text.split()
A = [norm(t) for t in tokens]
B = [norm(w.word) for w in ww]
times = [None] * len(tokens)
for blk in difflib.SequenceMatcher(None, A, B, autojunk=False).get_matching_blocks():
    for i in range(blk.size):
        w = ww[blk.b + i]
        times[blk.a + i] = (w.start, w.end)
# interpolate any unmatched tokens
known = [i for i, t in enumerate(times) if t]
for i, t in enumerate(times):
    if t: continue
    prev = max([j for j in known if j < i], default=None)
    nxt = min([j for j in known if j > i], default=None)
    s0 = times[prev][1] if prev is not None else 0.1
    e0 = times[nxt][0] if nxt is not None else dur - 0.3
    span = [j for j in range(prev + 1 if prev is not None else 0, nxt if nxt is not None else len(tokens))]
    k_ = span.index(i)
    step = (e0 - s0) / len(span)
    times[i] = (s0 + k_ * step, s0 + (k_ + 1) * step)
words = [{"text": t, "start": round(a, 3), "end": round(b, 3)} for t, (a, b) in zip(tokens, times)]
json.dump({"audio": "voiceover.wav", "duration": round(dur + 0.9, 3), "words": words}, open("public/voiceover.json", "w"), indent=1)
print(f"voice={voice} speed={speed}: {dur:.1f}s, matched {len(known)}/{len(tokens)} words")
