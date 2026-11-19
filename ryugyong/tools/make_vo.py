import json, base64, subprocess, urllib.request, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = {
 "narr":  ("cjVigY5qzO86Huf0OWal", {"stability":0.55,"similarity_boost":0.75,"style":0.1,"speed":0.92}),  # Eric
 "guest": ("iP95p4xoKVk53GoZ742B", {"stability":0.75,"similarity_boost":0.75,"style":0.0,"speed":0.9}),   # Chris
 "clerk": ("pNInz6obpgDQGcFmaJgB", {"stability":0.85,"similarity_boost":0.75,"style":0.0,"speed":0.85}),  # Adam
}
segs = json.load(open(f"{ROOT}/tools/segments.json"))
only = set(sys.argv[1:])
for s in segs:
    if only and s["id"] not in only: continue
    vid, vs = VOICES[s["spk"]]
    body = json.dumps({"text": s["text"], "model_id": "eleven_multilingual_v2", "voice_settings": vs}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128",
        data=body, headers={"Content-Type": "application/json"})
    d = json.load(urllib.request.urlopen(req))
    open(f"{ROOT}/audio/segments/{s['id']}.mp3","wb").write(base64.b64decode(d["audio_base64"]))
    json.dump(d["alignment"], open(f"{ROOT}/audio/segments/{s['id']}.align.json","w"))
    print(s["id"], "ok")
