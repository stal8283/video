"""Generate every sound cue with the ElevenLabs sound-effects API (cached in public/sfx11/)."""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

CUES = {
    "rain_city": ("Heavy rain falling on a river and bridge in a city at dusk, steady downpour ambience, distant traffic", 12),
    "car_interior": ("Inside a moving car during heavy rain, low engine hum, rain drumming on the roof, windshield wipers swishing", 12),
    "tire_screech": ("Car tires screeching on wet asphalt, short skid", 1.6),
    "fall_whoosh": ("Car falling through the air, rushing wind whoosh, cinematic", 2.2),
    "car_splash": ("A car crashing nose-first into a river, huge heavy water splash impact, cinematic", 3.0),
    "truck_horn": ("Loud semi truck air horn blast, close", 1.4),
    "rear_crash": ("Car being rear-ended by a truck, heavy metal crunch impact, glass tinkle", 2.0),
    "rail_break": ("Car smashing through a metal highway guardrail, metal scrape and bang", 1.6),
    "float_lap": ("Car floating in a river, gentle water lapping against metal, soft creaks, rain", 6),
    "phone_dial": ("Smartphone keypad tones dialing three digits, nine one one", 1.4),
    "phone_ring": ("Phone ringback tone heard through a phone earpiece, two rings", 3.5),
    "water_fill": ("Water gurgling and trickling into a car cabin, rising water, muffled", 7),
    "door_shove": ("Person shoving hard against a stuck car door, dull heavy thud, strained grunt", 1.2),
    "metal_groan": ("Car body metal groaning and creaking under deep water pressure", 3.5),
    "stinger": ("Dramatic cinematic boom hit, deep impact, comedic record scratch before it", 2.0),
    "clock_tick": ("Loud stopwatch ticking fast, mechanical clock ticks", 7),
    "pressure_rumble": ("Deep underwater pressure rumble, ominous low drone", 6),
    "whoosh_up": ("Fast cinematic whoosh rising upward, camera fly up", 1.5),
    "siren_far": ("Distant ambulance siren wailing across a city", 5),
    "belt_click": ("Car seatbelt buckle unclicking and retracting quickly", 1.0),
    "window_down": ("Electric car window motor rolling down", 1.4),
    "water_gush": ("Water gushing and pouring in through an open car window, powerful flow", 5),
    "small_splash": ("Small splash, child swimming out into water", 1.5),
    "glass_smash": ("Emergency hammer smashing a car side window, tempered glass shattering into pieces", 2.2),
    "dull_thunk": ("Small hammer hitting thick laminated windshield glass, dull thud, no shatter", 1.0),
    "underwater": ("Muffled underwater ambience with bubbles rising, submerged", 7),
    "surface_gasp": ("Person bursting up out of water, splash, big gasp for air", 2.2),
    "swoosh": ("Quick soft swoosh transition sound", 0.7),
    "music_calm": ("Light suspenseful cinematic background music loop, soft pulsing synth, gentle plucks, curious mood, no vocals", 22),
    "music_tense": ("Tense dramatic cinematic background music loop, driving pulsing synth bass, ticking percussion, urgent, no vocals", 22),
}

def gen(name):
    text, dur = CUES[name]
    out = f"public/sfx11/{name}.mp3"
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        return name, "cached"
    body = json.dumps({"text": text, "duration_seconds": max(0.5, dur), "prompt_influence": 0.5})
    r = subprocess.run(["curl", "-sS", "-o", out, "-w", "%{http_code}", "-X", "POST", "https://api.elevenlabs.io/v1/sound-generation",
                        "-H", "xi-api-key: proxy-injected", "-H", "content-type: application/json", "-d", body], capture_output=True, text=True)
    code = r.stdout.strip()
    if code != "200":
        msg = open(out).read()[:200] if os.path.exists(out) else r.stderr
        os.remove(out) if os.path.exists(out) else None
        return name, f"ERROR {code} {msg}"
    return name, "ok"

names = sys.argv[1:] or list(CUES)
with ThreadPoolExecutor(4) as ex:
    for n, s in ex.map(gen, names):
        print(n, s)
