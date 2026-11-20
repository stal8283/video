"""The plan of a vertical Short, anchored to the WORDS of the voice-over (never to typed seconds).
Edit SHOTS, BEATS, SFX, ACCENT and TAGS below, then run from the project folder:

    python plan/plan_src.py                       # reads vo/timings.json, writes src/plan.gen.ts + plan.json + PLAN.md
    python plan/plan_src.py vo/timings.json src/plan.gen.ts

timings.json (written by scripts/vo_prep.py), either form works:
    {"words": [{"w": "Hello", "t": 0.12, "end": 0.48}, ...]}
    {"turns": [{"turn": 1, "words": [...]}, ...]}          (several speakers / takes)
An anchor is (word, nth) — the nth time that word is spoken — or (turn, word, nth) for multi-turn files.
If the VO changes, re-run: every shot, beat, caption and sound moves with its word.
"""
import json
import re
import sys
from pathlib import Path

FPS = 30
LEAD = 6 / FPS  # camera moves start ~6 frames before their word

# ---- the story, by words ---------------------------------------------------------------------------------------
# A shot = one setup: a set, a mood (the light of this act), a framing. Inside a shot the camera keeps moving on
# BEATS (about one per second for Shorts). The move between two shots IS the transition (no hard cuts).
SHOTS = [
    # id,   anchor,              set,          mood,     note (what the viewer must see)
    ("S01", ("this", 1),         "boulevard",  "night",  "HOOK: the Guest pulls a suitcase toward the glowing 105-floor pyramid; key object in frame from frame 0"),
    ("S02", ("one", 1),          "lobby",      "lamp",   "elevator dial counts to 105 [tag], key rack with every key on its hook; skit 1: Guest vs deadpan Clerk"),
    ("S03", ("but", 1),          "boulevard",  "night",  "the dark pyramid switches on row by row; a passer-by looks up"),
    ("S04", ("so", 2),           "table",      "golden", "the architect's table: the blueprint unrolls, a red pencil circles the empty inside"),
    ("S05", ("singapore", 1),    "singapore",  "golden", "Singapore 1986: the round tower, a doorman cheers, banner TALLEST HOTEL 1986 [tag]"),
    ("S06", ("north", 2),        "table",      "golden", "golden close-up: the pyramid model grows taller than the Singapore model"),
    ("S07", ("work", 1),         "boulevard",  "day",    "1987: floors stack up, a crane, the builder with a blueprint"),
    ("S08", ("then", 1),         "boulevard",  "cold",   "1992 [tag]: work stops, the USSR banner falls, the bare concrete shell in the wind for 16 years"),
    ("S09", ("by", 1),           "boulevard",  "day",    "2011: the glass skin climbs the pyramid, the glass fitter holds a panel"),
    ("S10", ("it's", 2),         "table",      "golden", "the wrapped present: glint, the lid lifts, the box is empty, one moth flies out"),
    ("S11", ("in", 5),           "lobby",      "day",    "2012: the Exec signs, banner OPENING 2013 [tag]; months later she walks out, the banner falls"),
    ("S12", ("opening", 1),      "lobby",      "lamp",   "skit 2: Opening date? / Soon. / Which year? / ...Soon."),
    ("S13", ("tonight", 1),      "boulevard",  "night",  "PAYOFF: back to the opening image, 100,000 lights switch on, the flag glows at the top"),
]
# Camera beats: (anchor, move, params).  ~56/min including the shot changes.
BEATS = [
    # S01 hook
    (("tallest", 1), "PUSH", {"frac": 0.12}),
    (("korea", 1), "CRANE_UP", {"up": 0.7, "tilt": 0.5}),
    (("never", 1), "PUSH", {"frac": 0.12}),
    (("guest", 1), "PUNCH", {"frac": 0.1}),
    # S02 lobby + skit 1
    (("floors", 1), "PUSH", {"frac": 0.14}),
    (("zero", 1), "DOLLY_L", {"dur": 0.85, "to": {"pos": [0.95, 1.95, -0.2], "look": [0.95, 2.0, -3.45], "fov": 46}}),
    (("do", 1), "PULL", {"dur": 0.9, "to": {"pos": [0.75, 1.45, 2.3], "look": [0.68, 1.3, -1.6], "fov": 58}}),
    (("we", 1), "ORBIT_L", {"deg": 16}),
    (("floors", 2), "PUSH", {"frac": 0.12}),
    (("so", 1), "ORBIT_R", {"deg": 14}),
    (("yes", 1), "PUSH", {"frac": 0.12}),
    (("no", 1), "PUNCH", {"frac": 0.12}),
    # S03 the twist
    (("strange", 1), "PUSH", {"frac": 0.12}),
    (("lights", 1), "CRANE_UP", {"up": 0.8, "tilt": 0.6}),
    (("show", 1), "ORBIT_L", {"deg": 14}),
    (("guests", 1), "PUSH", {"frac": 0.14}),
    # S04 table: why?
    (("build", 1), "PUSH", {"frac": 0.14}),
    (("why", 2), "ORBIT_R", {"deg": 16}),
    (("finish", 1), "PUSH", {"frac": 0.12}),
    # S05 Singapore 1986
    (("tallest", 2), "CRANE_UP", {"up": 1.0, "tilt": 2.2, "dur": 0.9}),
    (("south", 1), "PULL", {"frac": -0.18}),
    (("built", 1), "ORBIT_L", {"deg": 14}),
    # S06 the models
    (("reportedly", 1), "PUSH", {"frac": 0.12}),
    (("taller", 1), "CRANE_UP", {"up": 0.12, "tilt": 0.6}),
    (("one", 2), "PUNCH", {"frac": 0.1}),
    # S07 1987
    (("starts", 1), "CRANE_UP", {"up": 0.7, "tilt": 0.5}),
    (("eighty-seven", 1), "PUSH", {"frac": 0.12}),
    # S08 1992-2008
    (("ninety-two", 1), "PUSH", {"frac": 0.14}),
    (("money", 1), "ORBIT_R", {"deg": 12}),
    (("soviet", 1), "ORBIT_L", {"deg": 16}),
    (("collapsed", 1), "PUNCH", {"frac": 0.12}),
    (("sixteen", 1), "PULL", {"frac": -0.2}),
    (("bare", 1), "ORBIT_R", {"deg": 14}),
    (("pyramid", 1), "PUSH", {"frac": 0.12}),
    # S09 2011
    (("egyptian", 1), "CRANE_UP", {"up": 0.8, "tilt": 0.6, "dur": 1.0}),
    (("glass", 1), "PUSH", {"frac": 0.12}),
    # S10 the present
    (("present", 1), "PUSH", {"frac": 0.12}),
    (("shiny", 1), "ORBIT_L", {"deg": 14}),
    (("empty", 1), "PUNCH", {"frac": 0.12}),
    (("box", 1), "PULL", {"frac": -0.16}),
    # S11 2012
    (("twelve", 1), "PUSH", {"frac": 0.12}),
    (("signs", 1), "ORBIT_R", {"deg": 14}),
    (("later", 1), "DOLLY_L", {}),
    (("out", 2), "PULL", {"frac": -0.18}),
    # S12 skit 2
    (("date", 1), "PUSH", {"frac": 0.12}),
    (("soon", 1), "ORBIT_L", {"deg": 12}),
    (("which", 1), "PUSH", {"frac": 0.12}),
    (("soon", 2), "PUNCH", {"frac": 0.12}),
    # S13 payoff (calmer)
    (("hundred", 3), "PUSH", {"frac": 0.12}),
    (("switch", 1), "CRANE_UP", {"up": 1.4, "tilt": 1.6, "dur": 1.1}),
    (("flag", 1), "PUSH", {"frac": 0.14}),
    (("every", 2), "ORBIT_R", {"deg": 12}),
    (("empty", 2), "PULL", {"frac": -0.18}),
]
# Sound effects are driven by src/short/sfx.ts (one cue per on-screen action, anchored to these same words).
SFX = []
# Accent color words in captions: at most one per sentence.
ACCENT = [("guest", 1), ("lights", 1), ("empty", 1), ("empty", 2)]
# Painted tags on key objects (sound-off readability): the story's key facts only.
TAGS = [
    (("floors", 1), "105", "the elevator floor dial in the lobby"),
    (("singapore", 1), "1986", "the TALLEST HOTEL banner in Singapore"),
    (("ninety-two", 1), "1992", "a stencil on the halted crane's counterweight"),
    (("twelve", 1), "OPENING 2013", "the banner over the reception desk"),
]


def norm(w):
    """the same normalization as core/captions.tsx: lowercase, keep letters, digits, ' and -"""
    return re.sub(r"[^a-z0-9'-]", "", w.lower())


def load(p):
    data = json.loads(Path(p).read_text(encoding="utf8"))
    words = []
    if "words" in data:
        for w in data["words"]:
            words.append({"turn": 1, "w": w["w"], "t": float(w["t"]), "end": float(w["end"])})
    for tr in data.get("turns", []):
        for w in tr["words"]:
            words.append({"turn": tr["turn"], "w": w["w"], "t": float(w["t"]), "end": float(w["end"])})
    if not words:
        raise SystemExit(f"no words in {p}")
    return sorted(words, key=lambda w: w["t"])


def find(words, anchor):
    if len(anchor) == 3:
        turn, word, nth = anchor
    else:
        turn, (word, nth) = None, anchor
    k = 0
    for w in words:
        if (turn is None or w["turn"] == turn) and norm(w["w"]) == norm(word):
            k += 1
            if k == nth:
                return w
    raise SystemExit(f"anchor not found: {anchor!r}. Use a word that is spoken in the voice-over "
                     f"(first words: {' '.join(w['w'] for w in words[:12])} ...)")


def chunk_count(words):
    letters = lambda s: len(re.sub(r"[^a-z0-9]", "", s.lower()))
    i = n = 0
    while i < len(words):
        w = words[i]["w"]
        nx = words[i + 1]["w"] if i + 1 < len(words) else None
        two = nx is not None and not re.search(r"[.?!,]$", w) and letters(w) <= 4 and letters(nx) <= 5 \
            and letters(w) + letters(nx) <= 9
        i += 2 if two else 1
        n += 1
    return n


def main(p, out):
    out = Path(out)
    if not out.parent.is_dir():
        raise SystemExit(f"{out.parent} does not exist: run this from the project folder or pass the output path")
    words = load(p)
    total = round(words[-1]["end"] + 0.7, 3)  # the picture ends ~0.7 s after the last word
    shots = []
    for i, (sid, anchor, set_, mood, note) in enumerate(SHOTS):
        t0 = 0.0 if i == 0 else find(words, anchor)["t"]
        shots.append({"id": sid, "t": round(t0, 3), "set": set_, "mood": mood, "note": note})
    for a, b in zip(shots, shots[1:] + [{"t": total}]):
        a["end"] = round(b["t"], 3)
    beats = []
    for anchor, move, prm in BEATS:
        w = find(words, anchor)
        t = w["t"] if move == "SHAKE" else max(0.0, w["t"] - LEAD)
        beats.append({"t": round(t, 3), "move": move, "word": w["w"], "prm": prm})
    beats.sort(key=lambda b: b["t"])
    sfx = [{"t": round(find(words, a)["t"], 3), "file": f, "db": db} for a, f, db in SFX]
    accent_words = sorted({norm(find(words, a)["w"]) for a in ACCENT})
    tags = [{"text": tx, "t": round(find(words, a)["t"], 3), "note": nt} for a, tx, nt in TAGS]
    has_voice = (out.parent.parent / "public" / "vo" / "voice.wav").exists()

    # ---- report: the numbers to check before any render
    moves = [b for b in beats if b["move"] != "SHAKE"]
    bpm = (len(moves) + len(shots) - 1) / (total / 60)  # a shot change is a move too
    starts = [w for i, w in enumerate(words) if i == 0 or re.search(r"[.?!]$", words[i - 1]["w"])]
    on_beat = sum(1 for w in starts if any(abs(b["t"] + LEAD - w["t"]) < 0.25 for b in moves) or any(abs(s["t"] - w["t"]) < 0.25 for s in shots))
    times = sorted([0.0] + [b["t"] for b in moves] + [s["t"] for s in shots] + [total])
    gaps = [(b - a, a) for a, b in zip(times, times[1:])]
    longest = max(gaps)
    print(f"{total:.1f} s | {len(shots)} shots | {len(moves)} moves + {len(shots) - 1} transitions = {bpm:.0f} beats/min (target 52-60 for Shorts)")
    print(f"sentence starts on a beat or shot change: {on_beat}/{len(starts)} | longest hold {longest[0]:.1f} s at {longest[1]:.1f} s")
    print(f"{chunk_count(words)} caption chunks | {len(accent_words)} accents | {len(tags)} tags | {len(sfx)} SFX | voice file: {'yes' if has_voice else 'NO (public/vo/voice.wav missing)'}")
    for s in shots:
        if s["end"] - s["t"] < 1.5:
            print(f"WARN shot {s['id']} is only {s['end'] - s['t']:.2f} s")
    if bpm < 48:
        print("WARN too few beats: add moves on clause starts")
    if bpm > 66:
        print("WARN too many beats: it will read as frantic")
    if longest[0] > 2.6:
        print("WARN a hold longer than 2.6 s: add a beat there")
    if len(tags) > max(1, total / 15 + 1):
        print("WARN too many tags: key facts only, about one per 15 s")

    rows = [[w["w"], round(w["t"], 3), round(w["end"], 3)] for w in words]
    out.write_text(
        "// generated by plan/plan_src.py; do not edit (edit plan/plan_src.py and re-run)\n"
        f"export const FPS = {FPS};\nexport const DURATION = {round(total * FPS)};\n"
        f"export const HAS_VOICE = {'true' if has_voice else 'false'};\n"
        f"export const SHOTS = {json.dumps(shots)} as const;\n"
        f"export const BEATS = {json.dumps(beats)} as const;\n"
        f"export const SFX: readonly {{ t: number; file: string; db: number }}[] = {json.dumps(sfx)};\n"
        "/** [text, onset s, end s] for makeChunks() in core/captions.tsx */\n"
        f"export const WORDS = {json.dumps(rows)} as const;\n"
        f"export const ACCENT_WORDS: readonly string[] = {json.dumps(accent_words)};\n"
        f"export const TAGS: readonly {{ text: string; t: number; note: string }}[] = {json.dumps(tags)};\n", encoding="utf8")
    root = out.parent.parent if out.parent.name == "src" else out.parent
    (root / "plan.json").write_text(json.dumps({"fps": FPS, "duration_s": total, "shots": shots, "beats": beats, "sfx": sfx,
                                                 "accent_words": accent_words, "tags": tags}, indent=1), encoding="utf8")
    # a readable plan for the person
    md = [f"# Plan ({total:.1f} s, {bpm:.0f} beats/min)", "", "| shot | from | to | set | light | what we see |", "|---|---|---|---|---|---|"]
    md += [f"| {s['id']} | {s['t']:.1f} s | {s['end']:.1f} s | {s['set']} | {s['mood']} | {s['note']} |" for s in shots]
    md += ["", "| time | camera move | on the word |", "|---|---|---|"]
    md += [f"| {b['t']:.2f} s | {b['move']} | {b['word']} |" for b in beats]
    if tags:
        md += ["", "Tags painted in the world: " + ", ".join(f"**{t['text']}** ({t['note']})" for t in tags)]
    if sfx:
        md += ["", "Sound effects: " + ", ".join(f"{s['file']} at {s['t']:.2f} s" for s in sfx)]
    (root / "PLAN.md").write_text("\n".join(md) + "\n", encoding="utf8")
    print("wrote", out, "plan.json and PLAN.md")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vo/timings.json", sys.argv[2] if len(sys.argv) > 2 else "src/plan.gen.ts")
