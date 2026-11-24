#!/usr/bin/env python3
"""
shortmaker.py - turn raw GTA 6 gameplay + a script into a vertical "guide" short
in the style of the reference video (blurred 9:16 fill, punchy one-word captions,
red arrow callouts on the HUD, fast voiceover).

Usage:
    python3 tools/shortmaker.py projects/<name>.json

Pipeline:
  1. Voiceover   - ElevenLabs TTS from `voiceover.script` (word timings come back
                   with the audio), OR an existing `voiceover.audio` file that is
                   transcribed with faster-whisper for word timings.
  2. Captions    - one word on screen at a time, pop-in animation, money amounts
                   in green, hype words in yellow (ASS subtitles via libass).
  3. Video       - clips trimmed + concatenated, cropped into a 1080xBAND window
                   over a blurred, darkened copy of itself (fills 1080x1920).
  4. Callouts    - red arrows overlaid at given times/positions.
  5. Audio       - voiceover on top, game audio + optional music ducked under it.
"""
import base64
import json
import math
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "assets" / "fonts"
W, H = 1080, 1920

MONEY_RE = re.compile(r"^\$?[\d,.]+[kKmM]?$|^\$")
DEFAULT_HYPE = {
    "legendary", "secret", "free", "insane", "rare", "hidden", "glitch",
    "unlimited", "fastest", "best", "never", "craziest", "illegal", "broken",
}


# --------------------------------------------------------------------------- #
# Voiceover
# --------------------------------------------------------------------------- #
def tts_elevenlabs(text, voice_id, out_mp3, speed=1.1, model="eleven_multilingual_v2",
                   spoken_as=None):
    """Generate speech and return word timings [(word, start, end), ...].

    spoken_as: {"0420": "zero four two zero"} - the TTS reads the phrase, but the
    captions show the original token (timed across the whole phrase).
    """
    spoken_as = spoken_as or {}
    for token, phrase in spoken_as.items():
        text = text.replace(token, phrase)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/with-timestamps"
    body = json.dumps({
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8,
                           "style": 0.35, "speed": speed},
    }).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers={
        "Content-Type": "application/json",
        # Real key is injected by the environment proxy / or set ELEVENLABS_API_KEY.
        "xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "proxy-injected"),
    })
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.load(r)
    Path(out_mp3).write_bytes(base64.b64decode(data["audio_base64"]))
    al = data["alignment"]
    words, cur, start, end = [], "", None, None
    for ch, s, e in zip(al["characters"], al["character_start_times_seconds"],
                        al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append((cur, start, end))
            cur, start = "", None
            continue
        if start is None:
            start = s
        cur += ch
        end = e
    if cur:
        words.append((cur, start, end))
    # merge spoken phrases back into the display token
    for token, phrase in spoken_as.items():
        n = len(phrase.split())
        i = 0
        while i <= len(words) - n:
            seg = [w for w, _, _ in words[i:i + n]]
            if [x.strip(".,!?").lower() for x in seg] == [x.lower() for x in phrase.split()]:
                trail = seg[-1][len(seg[-1].rstrip(".,!?")):]
                words[i:i + n] = [(token + trail, words[i][1], words[i + n - 1][2])]
            i += 1
    return words


def transcribe(audio):
    """Word timings from an existing voiceover via faster-whisper."""
    import numpy as np
    import wave
    from faster_whisper import WhisperModel
    wav = str(Path(audio).with_suffix(".16k.wav"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", audio, "-ar", "16000",
                    "-ac", "1", wav], check=True)
    w = wave.open(wav)
    a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = model.transcribe(a, word_timestamps=True)
    return [(wd.word.strip(), wd.start, wd.end) for s in segs for wd in s.words]


# --------------------------------------------------------------------------- #
# Captions (ASS)
# --------------------------------------------------------------------------- #
def ass_time(t):
    t = max(0.0, t)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def build_ass(words, path, cap, hype):
    y = cap.get("y", 560)
    size = cap.get("size", 145)
    upper = cap.get("uppercase", False)
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Word,{cap.get('font', 'Anton')},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H96000000,0,0,0,0,100,100,1,0,1,{cap.get('outline', 7)},{cap.get('shadow', 5)},5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    for i, (word, s, e) in enumerate(words):
        nxt = words[i + 1][1] if i + 1 < len(words) else e + 0.4
        end = min(nxt, e + 0.5) if nxt - e > 0.5 else nxt
        clean = re.sub(r"[^\w$,.%'-]", "", word).strip(".,")
        if not clean:
            continue
        key = clean.lower().strip("'")
        colour = ""
        if "$" in clean:
            colour = r"\c&H5CFF4A&"          # money green (#4AFF5C, BGR)
        elif key in hype:
            colour = r"\c&H00D7FF&"          # hype yellow (#FFD700, BGR)
        txt = clean.upper() if upper else clean
        wy = next((o["y"] for o in cap.get("y_overrides", [])
                   if o["from"] <= s < o["to"]), y)
        pop = r"\fscx65\fscy65\t(0,70,\fscx110\fscy110)\t(70,130,\fscx100\fscy100)"
        lines.append(f"Dialogue: 0,{ass_time(s)},{ass_time(end)},Word,,0,0,0,,"
                     f"{{\\an5\\pos({W // 2},{wy}){pop}{colour}}}{txt}")
    Path(path).write_text(header + "\n".join(lines) + "\n", encoding="utf-8")


# --------------------------------------------------------------------------- #
# Arrow callout asset
# --------------------------------------------------------------------------- #
def make_arrow(path, rotate=0, size=150):
    """Red arrow pointing up-right by default (like the reference), rotated by `rotate` deg."""
    from PIL import Image, ImageDraw
    s = size * 2
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # arrow pointing to the right, centered, then rotated
    shaft = [(s * .12, s * .43), (s * .58, s * .43), (s * .58, s * .57), (s * .12, s * .57)]
    head = [(s * .52, s * .25), (s * .90, s * .50), (s * .52, s * .75)]
    for off, col in ((10, (0, 0, 0, 255)), (0, (235, 20, 20, 255))):
        grow = lambda pts: [(x + (off if x > s / 2 else -off) * 0.5, y + (off if y > s / 2 else -off) * 0.5) for x, y in pts]
        d.polygon(grow(shaft), fill=col)
        d.polygon(grow(head), fill=col)
    im = im.rotate(rotate, resample=Image.BICUBIC, expand=False)
    im.resize((size, size), Image.LANCZOS).save(path)


# --------------------------------------------------------------------------- #
# Render
# --------------------------------------------------------------------------- #
def probe_duration(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", f], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def has_audio(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a",
                          "-show_entries", "stream=index", "-of", "csv=p=0", f],
                         capture_output=True, text=True)
    return bool(out.stdout.strip())


def render(cfg_path):
    cfg_path = Path(cfg_path).resolve()
    cfg = json.loads(cfg_path.read_text())
    base = cfg_path.parent
    rel = lambda p: str((base / p).resolve()) if p else p
    out = Path(rel(cfg["output"]))
    work = out.parent / (out.stem + "_work")
    work.mkdir(parents=True, exist_ok=True)

    # 1. voiceover ----------------------------------------------------------
    vo = cfg["voiceover"]
    words_json = work / "words.json"
    if vo.get("audio"):
        vo_audio = rel(vo["audio"])
        words = transcribe(vo_audio)
    else:
        vo_audio = str(work / "vo.mp3")
        if not (words_json.exists() and Path(vo_audio).exists() and
                json.loads(words_json.read_text()).get("script") == vo["script"]):
            words = tts_elevenlabs(vo["script"], vo.get("voice_id", "TX3LPaxmHKxFdv7VOQHJ"),
                                   vo_audio, speed=vo.get("speed", 1.1),
                                   spoken_as=vo.get("spoken_as"))
            words_json.write_text(json.dumps({"script": vo["script"], "words": words}))
        words = json.loads(words_json.read_text())["words"]
    vo_dur = probe_duration(vo_audio) + cfg.get("tail", 0.4)
    print(f"voiceover: {vo_dur:.1f}s, {len(words)} words")

    # 2. captions -----------------------------------------------------------
    hype = DEFAULT_HYPE | {w.lower() for w in cfg.get("hype_words", [])}
    ass = work / "captions.ass"
    build_ass(words, ass, cfg.get("captions", {}), hype)

    # 3. inputs + filtergraph -------------------------------------------------
    band = cfg.get("band_height", 1220)
    clips = cfg["clips"]
    args = ["ffmpeg", "-v", "error", "-stats", "-y"]
    fg = []
    game_audio = cfg.get("game_audio_volume", 0.18)
    clip_has_audio = []
    fps = cfg.get("fps", 60)
    fg_eq = f",eq={cfg['fg_eq']}" if cfg.get("fg_eq") else ""
    # optional motion interpolation (e.g. 30 -> 60 fps): each clip is cut and
    # interpolated once into the work dir, in parallel, and reused on re-renders.
    interp = cfg.get("interpolate")
    if interp:
        clips = [dict(c) for c in clips]
        jobs = []
        for k, c in enumerate(clips):
            src = rel(c["file"])
            key = f"{Path(src).stem}_{c.get('start', 0)}_{c.get('end', 'end')}_{interp}"
            dst = work / f"interp_{key}.mp4"
            if not dst.exists():
                cmd = ["ffmpeg", "-v", "error", "-y"]
                if "start" in c:
                    cmd += ["-ss", str(c["start"])]
                if "end" in c:
                    cmd += ["-to", str(c["end"])]
                cmd += ["-i", src, "-vf",
                        f"minterpolate=fps={interp}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
                        "-c:a", "aac", "-b:a", "192k", str(dst) + ".tmp.mp4"]
                jobs.append((cmd, dst))
            dur = c["end"] - c["start"] if "end" in c else None
            c["file"], c.pop("start", None), c.pop("end", None)
            c["file"] = str(dst)
            if dur:
                c["start"], c["end"] = 0, dur
        from concurrent.futures import ThreadPoolExecutor
        def run(job):
            cmd, dst = job
            subprocess.run(cmd, check=True)
            os.replace(str(dst) + ".tmp.mp4", dst)
        if jobs:
            print(f"interpolating {len(jobs)} clips to {interp} fps ...")
            with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as ex:
                list(ex.map(run, jobs))
        fps = interp

    hud = cfg.get("hud_inset", {})
    for i, c in enumerate(clips):
        f = rel(c["file"])
        if "start" in c:
            args += ["-ss", str(c["start"])]
        if "end" in c:
            args += ["-to", str(c["end"])]
        args += ["-i", f]
        clip_has_audio.append(has_audio(f))
        pre = f"crop={c['crop']}," if c.get("crop") else ""
        spd = c.get("speed", 1.0)
        dur = (c["end"] - c["start"]) / spd if "end" in c else 1
        # per-clip vertical composition: blurred fill + 1080xBAND window.
        # `focus` (0=left, 0.5=centre, 1=right) positions the window; `pan`
        # [from, to] drifts it across the clip (adds motion to still shots);
        # `zoom` punches in; `hud` overlays an inset of the HUD money area.
        focus = c.get("focus", 0.5)
        if c.get("pan"):
            f0, f1 = c["pan"]
            fx = f"({f0}+({f1}-{f0})*min(t/{dur:.3f}\\,1))"
        else:
            fx = str(focus)
        z = c.get("zoom", cfg.get("zoom", 1.0))
        bh = int(band * z)
        nsplit = 3 if c.get("hud") else 2
        outs = "[bs{0}][fs{0}]".format(i) + ("[hs{0}]".format(i) if c.get("hud") else "")
        fg.append(f"[{i}:v]{pre}scale=1920:1080:force_original_aspect_ratio=increase,"
                  f"crop=1920:1080,setsar=1,fps={fps},setpts=(PTS-STARTPTS)/{spd},"
                  f"split={nsplit}{outs}")
        fg.append(f"[bs{i}]scale={W}:{H}:force_original_aspect_ratio=increase,"
                  f"crop={W}:{H},gblur=sigma=35,eq=brightness=-0.08:saturation=1.1[bg{i}]")
        fg.append(f"[fs{i}]scale=-2:{bh},crop={W}:{band}:(iw-{W})*{fx}:(ih-{band})*{c.get('focus_y', 0.5)}{fg_eq}[fv{i}]")
        top = (H - band) // 2
        if c.get("hud"):
            hx, hy, hw, hh = hud.get("src", [1600, 0, 320, 470])
            sc = hud.get("scale", 0.9)
            ow, oh = int(hw * sc) // 2 * 2, int(hh * sc) // 2 * 2
            fg.append(f"[hs{i}]crop={hw}:{hh}:{hx}:{hy},scale={ow}:{oh},"
                      f"drawbox=x=0:y=0:w=iw:h=ih:color=white@0.85:t=4[hud{i}]")
            fg.append(f"[bg{i}][fv{i}]overlay=0:{top}[pre{i}]")
            fg.append(f"[pre{i}][hud{i}]overlay={hud.get('x', 16)}:{top + hud.get('y', 16)},setsar=1[v{i}]")
        else:
            fg.append(f"[bg{i}][fv{i}]overlay=0:{top},setsar=1[v{i}]")
        if clip_has_audio[i]:
            atempo = f",atempo={spd}" if spd != 1.0 else ""
            fg.append(f"[{i}:a]asetpts=PTS-STARTPTS{atempo},aresample=48000,"
                      f"aformat=channel_layouts=stereo[a{i}]")
        else:
            fg.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{dur}[a{i}]")
    n = len(clips)
    fg.append("".join(f"[v{i}][a{i}]" for i in range(n)) +
              f"concat=n={n}:v=1:a=1[cv][ca]")

    vo_idx = n
    args += ["-i", vo_audio]
    music = cfg.get("music")
    if music:
        args += ["-stream_loop", "-1", "-i", rel(music["file"])]

    fg.append("[cv]null[comp0]")

    # 4. arrows -------------------------------------------------------------
    last = "comp0"
    idx = vo_idx + 1 + (1 if music else 0)
    for k, a in enumerate(cfg.get("callouts", [])):
        png = work / f"arrow{k}.png"
        make_arrow(png, rotate=a.get("rotate", 30), size=a.get("size", 150))
        args += ["-loop", "1", "-i", str(png)]
        t0, t1 = a["t"], a["t"] + a.get("dur", 1.5)
        # little bounce toward the target
        bob = f"6*sin(2*PI*3*(t-{t0}))"
        fg.append(f"[{idx}:v]format=rgba[ar{k}]")
        fg.append(f"[{last}][ar{k}]overlay=x={a['x']}-overlay_w/2+{bob}:"
                  f"y={a['y']}-overlay_h/2+{bob}:enable='between(t,{t0},{t1})':"
                  f"shortest=1[c{k}]")
        last = f"c{k}"
        idx += 1

    ass_esc = str(ass).replace(":", r"\:")
    fg.append(f"[{last}]ass='{ass_esc}':fontsdir='{FONTS}',"
              f"trim=0:{vo_dur:.3f},setpts=PTS-STARTPTS,format=yuv420p[vout]")

    # 5. audio mix ----------------------------------------------------------
    mix = [f"[ca]volume={game_audio},atrim=0:{vo_dur:.3f}[ga]",
           f"[{vo_idx}:a]aresample=48000,aformat=channel_layouts=stereo,"
           f"volume={cfg.get('vo_volume', 1.0)},apad=whole_dur={vo_dur:.3f}[vo]",
           "[vo]asplit=2[vo1][vokey]"]
    beds = ["[ga]"]
    if music:
        mix.append(f"[{vo_idx + 1}:a]aresample=48000,aformat=channel_layouts=stereo,"
                   f"volume={music.get('volume', 0.12)},atrim=0:{vo_dur:.3f}[mu]")
        beds.append("[mu]")
    mix.append("".join(beds) + f"amix=inputs={len(beds)}:normalize=0[bed]")
    mix.append("[bed][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=300[duck]")
    mix.append("[vo1][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95,"
               f"atrim=0:{vo_dur:.3f}[aout]")
    fg += mix

    total_clip = sum((c.get("end", 0) - c.get("start", 0)) / c.get("speed", 1.0)
                     for c in clips if "end" in c)
    if total_clip and total_clip < vo_dur:
        print(f"WARNING: clips total {total_clip:.1f}s but voiceover is {vo_dur:.1f}s - "
              "video will end early. Add more footage.")

    (work / "filtergraph.txt").write_text(";\n".join(fg))
    args += ["-filter_complex_script", str(work / "filtergraph.txt"),
             "-map", "[vout]", "-map", "[aout]",
             "-c:v", "libx264", "-preset", cfg.get("preset", "medium"), "-crf", "20",
             "-maxrate", cfg.get("maxrate", "6M"), "-bufsize", "12M",
             "-profile:v", "high", "-r", str(fps), "-c:a", "aac", "-b:a", "192k",
             "-movflags", "+faststart", "-t", f"{vo_dur:.3f}", str(out)]
    subprocess.run(args, check=True)
    print(f"done -> {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    render(sys.argv[1])
