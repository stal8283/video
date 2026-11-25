"""Generates the photoreal scene plates via pollinations.ai (free tier: 1 image / 45 s).
Usage: python3 gen_images.py [name ...]   (no names = all missing)"""
import json, os, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "img")
STYLE = ", photorealistic cinematic film still, 35mm photo, muted cold desaturated colors, overcast, high detail, sharp focus"
SHOTS = {
    "keepers3": "three adult men, Scottish lighthouse keepers in the year 1900, standing side by side in a row facing the camera, waist up, all wearing identical dark navy wool double-breasted uniform jackets with brass buttons and black peaked sailor caps, beards, rocky island, tall white stone lighthouse behind them",
    "keeper1": "one adult man, Scottish lighthouse keeper in 1900, portrait facing the camera, chest up, dark navy wool uniform jacket with brass buttons and black peaked cap, beard, standing in front of a white stone lighthouse on a cliff",
    "island_aerial": "aerial drone photo of a tiny remote steep rocky island in the stormy Atlantic ocean with a small white stone lighthouse and cottage on top, cliffs, waves",
    "lighthouse_storm": "a tall white stone lighthouse on a black rocky cliff at night during a violent storm, dark sky, rain, waves crashing, lantern dark, dramatic",
    "map": "antique vintage paper sea chart of the west coast of Scotland and the Outer Hebrides islands, aged parchment, ink coastlines, compass rose, top-down photo",
    "ship_night": "a 1900 steamship at sea at night, sailors standing on the deck at the railing looking toward a distant dark island, one sailor in the foreground facing the camera with a worried face, wool coat and cap, moody",
    "lantern_dark": "close up of the top of an old stone lighthouse, glass lantern room completely dark and unlit at night, storm clouds",
    "storm_waves": "enormous storm waves crashing over a small rocky island with a white lighthouse in the North Atlantic, spray, dark grey sky, long exposure",
    "boat_arrives": "a small black 1900 steamship approaching the rocky landing of a steep remote island with a lighthouse on top, grey sea, overcast, mist",
    "landing": "empty stone landing jetty and steep stone steps carved up a cliff on a remote island, a bare empty flagpole at the top with no flag, nobody there, grey overcast, eerie",
    "climb": "an adult man, lighthouse keeper in 1900 with a dark wool coat and peaked cap, climbing steep stone steps up a cliff toward a lighthouse, seen from the front, facing the camera, full body, wind",
    "door": "an adult man, 1900 lighthouse keeper in a dark wool coat and cap, standing facing the camera in front of the closed wooden green door of a whitewashed stone lighthouse cottage, closed iron gate, overcast",
    "beds": "interior of a small 1900 stone lighthouse cottage bedroom with three empty narrow iron beds with rumpled grey wool blankets, nobody, dim window light, dusty",
    "clock": "close up of an old wooden wall clock with a white face and black roman numerals hanging on a whitewashed stone wall, 1900, dim light",
    "fireplace": "a cold dead stone fireplace with grey ashes and no fire in an old 1900 cottage kitchen, iron kettle, frost, dim cold blue light",
    "shocked": "an adult man, 1900 lighthouse keeper in dark navy uniform and peaked cap, standing in a dark stone cottage interior, waist up, facing the camera, shocked, dim lantern light",
    "coats": "a row of three iron coat hooks on a whitewashed wooden wall, only one yellow oilskin raincoat hanging on the right hook, the other two hooks empty, 1900 interior, dim light",
    "running": "an adult man in a white shirt with no coat running out into a violent night storm on a rocky island, heavy rain, lighthouse cottage door open behind him, full body, motion",
    "railings": "bent and twisted iron railings on a high rocky cliff edge above a stormy sea, damaged by waves, overcast, grey",
    "investigators": "three adult men, Scottish officials in 1901 wearing long black overcoats and bowler hats, standing side by side in a row with arms crossed facing the camera, waist up, in front of a lighthouse on a rocky island, overcast",
    "giant_wave": "a gigantic towering ocean wave about to crash over a tiny rocky island with a small white lighthouse, storm, dark sky, epic scale",
    "empty_island": "a lonely small white lighthouse on a remote rocky island at dusk, calm dark grey sea, nobody, mist, melancholic",
}


def gen(name, seed=11):
    path = os.path.join(OUT, name + ".jpg")
    q = urllib.parse.quote(SHOTS[name] + STYLE)
    url = f"https://image.pollinations.ai/prompt/{q}?width=768&height=1344&nologo=true&seed={seed}"
    for attempt in range(8):
        r = subprocess.run(["curl", "-s", "-m", "180", "-o", path, "-w", "%{http_code}", url], capture_output=True, text=True)
        if r.stdout == "200" and open(path, "rb").read(2) == b"\xff\xd8":
            print("ok", name, flush=True)
            return True
        print("retry", name, r.stdout, open(path, "rb").read(160) if os.path.exists(path) else b"", flush=True)
        time.sleep(47)
    return False


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    seed = 11
    if args and args[0].startswith("--seed="):
        seed = int(args.pop(0).split("=")[1])
    names = args or [n for n in SHOTS if not os.path.exists(os.path.join(OUT, n + ".jpg"))]
    for n in names:
        gen(n, seed)
        time.sleep(47)
