import json, subprocess, os, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100; FPS = 30
segs = json.load(open(f"{ROOT}/tools/segments.json"))
def decode(p):
    raw = subprocess.run(["ffmpeg","-v","error","-i",p,"-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)
out = [np.zeros(int(0.15*SR),np.float32)]; t = 0.15
timings = {"fps":FPS,"segments":[],"words":[]}
for s in segs:
    a = decode(f"{ROOT}/audio/segments/{s['id']}.mp3")
    al = json.load(open(f"{ROOT}/audio/segments/{s['id']}.align.json"))
    chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    idx = [i for i,c in enumerate(chars) if c.strip() and c not in ".?!,"]
    t0 = max(0, st[idx[0]]-0.04); t1 = min(len(a)/SR, en[len(chars)-1]+0.12)
    clip = a[int(t0*SR):int(t1*SR)]
    # words
    w=""; ws=None
    for i,c in enumerate(chars+[" "]):
        if c==" ":
            if w:
                timings["words"].append({"seg":s["id"],"spk":s["spk"],"word":w,"start":round(t+ws-t0,3),"end":round(t+we-t0,3)})
            w=""; ws=None
        else:
            if ws is None: ws=st[i]
            we=en[i]; w+=c
    timings["segments"].append({"id":s["id"],"spk":s["spk"],"text":s["text"],"start":round(t,3),"end":round(t+len(clip)/SR,3)})
    out.append(clip); t += len(clip)/SR
    g = np.zeros(int(s["gap"]*SR),np.float32); out.append(g); t += s["gap"]
audio = np.concatenate(out)
# per-frame loudness (RMS, normalised) and speaker per frame
n = int(np.ceil(len(audio)/SR*FPS)); hop = SR//FPS
rms = np.array([np.sqrt(np.mean(audio[i*hop:(i+1)*hop]**2)+1e-12) for i in range(n)])
timings["loudness"] = [round(float(x),3) for x in np.clip(rms/np.percentile(rms,98),0,1)]
timings["duration"] = round(len(audio)/SR,3); timings["frames"] = n
json.dump(timings, open(f"{ROOT}/audio/timings.json","w"), indent=1)
pcm = (np.clip(audio,-1,1)*32767).astype(np.int16).tobytes()
subprocess.run(["ffmpeg","-v","error","-y","-f","s16le","-ar",str(SR),"-ac","1","-i","-","-af","loudnorm=I=-16:TP=-1.5:LRA=11","-ar",str(SR),f"{ROOT}/audio/voiceover.wav"],input=pcm,check=True)
subprocess.run(["ffmpeg","-v","error","-y","-i",f"{ROOT}/audio/voiceover.wav","-b:a","192k",f"{ROOT}/audio/voiceover.mp3"],check=True)
print("duration", timings["duration"], "frames", n, "words", len(timings["words"]))
for sg in timings["segments"]: print(f'{sg["start"]:6.2f}-{sg["end"]:6.2f} {sg["spk"]:5} {sg["text"]}')
