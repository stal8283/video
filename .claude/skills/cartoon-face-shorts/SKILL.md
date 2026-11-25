---
name: cartoon-face-shorts
description: Plan, script and edit YouTube Shorts / TikToks in the "cartoon-face" history style (photoreal AI scenes + realistic cutout bodies with flat hand-drawn cartoon heads, one-word captions, literal visuals for every noun). Use when making, planning, scripting or critiquing a video in this style, generating its image prompts, or building its edit with the flannan/ pipeline.
---

# Cartoon-face history Shorts — style playbook

Distilled from two reference videos studied frame by frame:
- **REF1 "The Dyatlov Pass Incident…"** (Hoodie Guy, 78 s, 2.7M views) — *mystery story* format.
- **REF2 "10 Weird Things You Didn't Know About Vikings"** (71 s) — *countdown listicle* format.

The working pipeline lives in `flannan/` (see "Pipeline" below). Follow this playbook for every new video.

---

## 1. The core look (both references)

- **Backgrounds:** photoreal AI stills (villages, battlefields, lakes, ships, interiors). Never illustrated.
- **Bodies:** photoreal full-body people cut out from a green screen, composited into the scene. Scale varies a lot: huge foreground heroes, tiny figures in wide/aerial shots.
- **Heads:** a flat hand-drawn cartoon head pasted over the **whole** real head (hat/helmet brim to below the chin, ear to ear). Real hat/helmet stays on top. Never show real skin of the face, forehead or ears.
  - Head style: beige/tan skin (#D8BA9E), thick black outline, big white eyes with tiny black pupils, grey eye bags, heavy brows, nose drawn as two lines or a bulb, wrinkle lines, small expressive mouth.
  - **Every character looks different**: face shape (round, egg, long, square jaw), skin tone (tan, pale, ruddy, grey for monsters, white-translucent for ghosts), hair drawn when no hat (bald dome, black spiky, ginger with braids, blonde, women with long hair), drawn beards (ginger, brown, grey) and moustaches, stubble.
- **Literal visuals:** every concrete noun the narrator says is shown at that moment (raven → a raven, "bit their shields" → biting a shield, "afterlife" → ghost, "Valhalla" → golden heaven with valkyries, "radiation" → Geiger counter). If you can't show it literally, show a character reacting to it.

## 2. Face behaviour (most important detail)

- Faces **never move randomly**. They change only on a story beat or a word. Blinks and idle drift are wrong.
- What does change on beats:
  - Expression swap: neutral → shock / scared / smug / deadpan / sad / angry / confused.
  - **Mouth flap while a character "talks" or screams**: alternate open/closed every ~0.2 s for the duration of the line or word.
  - Special eye states, tied to the content:
    - **tears** (blue streams) for crying or pain
    - **bloodshot pink eyes** for a trance or rage
    - **X eyes** for dead bodies
    - **closed eyes plus "Z Z Z"** for sleeping
    - **spiral or dizzy eyes**
  - Props drawn on the face/body: red blood marks and wounds, green stink lines (smell), sweat drops, coloured teeth (e.g. filed/striped teeth), blush.
- Ghost/spirit = the same character rendered white and semi-transparent, fading in beside or over the living one.
- Characters looking shocked in a **close-up crowd shot** (3+ heads filling the frame) is the go-to reaction for "but here's where it gets weird".

## 3. Motion (no frozen frames)

REF2 has **0 % still frames**; REF1 16 %. Target: ≤ 10 %.
- **Every shot pushes in** continuously, ~2–2.5 % zoom per second (REF2). Sometimes a hard "punch-in" cut to a tighter crop of the same scene with a vignette for emphasis (REF2 0:01.2).
- **Characters enter**: slide in from frame edges (REF1), walk/charge toward camera growing in size (both), pop up from below.
- **Actions via pose swaps**: two images of the same character (axe raised → swinging; sitting → lying down; standing → kicking). Ask for both poses when generating.
- **Fast motion = motion-blurred cutout sweep**: a slap, a swung weapon, a kick (REF2 0:42).
- **Animals and props animate**: a raven flaps across frame, a boat drifts across a top-down sea, arrows fly, fire flickers.
- **Tiny walking figures** on aerial and wide shots (both refs).
- Weather and particles: snow, rain, fog, embers.

## 4. Pacing & structure

| | REF1 mystery | REF2 countdown |
|---|---|---|
| Length | 78 s | 71 s |
| Avg shot | ~2.9 s | **~1.65 s** |
| Words/sec | ~3.5 | ~3.4 |
| Structure | hook → reality stamp → setup → "But…" clue ladder → unsatisfying official answer | title hook → items 10 → 1, ~6–7 s each, 2–4 shots per item |

- **Hook (0–2.5 s)** must be a comedic or perilous image plus the premise, e.g. REF2's Viking about to axe an apple off a tied-up kid's head while the title is read. REF1: "Imagine you… and every single one of them dies."
- **REF1 escalators**: "But it only got weirder", "But that wasn't all", "the craziest of all". **REF2 escalators**: "it gets even weirder", "even crazier", "but this was just the beginning", "but the weirdest part of all".
- **Ending = loop bait.** REF1 ends on the absurd official explanation (smug investigators). REF2 reaches "1." on the very last line and cuts, so viewers rewatch. Never add an outro.
- **The call to action is a gag inside the scene, not a voice line**: a background character holds a wooden **"Like & Subscribe"** sign. REF2 repeats it at 0:06, 0:23 and 0:37.

## 5. Text on screen

- **REF1 captions:** one word at a time, top-centre (~10 % from top), bold sans (Inter Bold), white with a thin black stroke, UPPERCASE.
- **REF2 captions:** 1–2 words at a time, **middle of the screen** (~55 % down), **hand-drawn comic font** in white with a thick black stroke, sentence case ("they bit", "the spirits").
- **Countdown badge (REF2):** the item number ("10.", "9.") in the same comic font, top-left, stays for the whole item.
- **Titles** fade in with a blur, white and soft: "1959", "2 MONTHS LATER", plus curved labels for places ("URAL MOUNTAINS" arcing over an aerial shot).
- **Red hand-drawn markers:** circles, dashed boxes, X eyes, red rib/eye icons on bodies, a cartoon pointing hand.

## 6. Colour

- REF1: bright, flat, desaturated daylight (saturation ~0.15, brightness ~127/255).
- REF2: warmer and muddier, saturated (~0.31), with fire-orange battle scenes.
- Pick one grade per video and apply it to the whole frame (backgrounds and cutouts together) so the cutouts sit in the scene.

## 7. Sound

- **Music bed runs the whole time**: dark or quirky, bass-heavy (REF1 sub-bass sits ~+2 dB over the voice band).
- **REF2 is a brick-wall master**: −6 LUFS with 1 LU of loudness range. Everything is dense and loud.
  - Target about **−9 LUFS** integrated with heavy compression. YouTube turns it down to −14 anyway, but the density reads as energy.
- **SFX on every action:**
  - whooshes on entrances and cuts
  - impacts on reveals
  - comedic pops or boings on face changes
  - literal foley: axe thunk, raven caw, thunder, footsteps, crowd war-cry
  - **riser → boom → drone** at each big turn
- **Voice:** fast, conversational and bright. Add a presence/air boost (+3 dB at 3.5 kHz, high shelf +5–7 dB at 7 kHz).

## 8. Image generation recipe (Leonardo, free web tokens)

- **Characters:** full body, *"isolated on a plain solid bright green background, even studio lighting, photorealistic, entire body visible from head to boots"*. No green clothing. Generate **2 poses** for any character that acts (idle plus the action pose).
- **Backgrounds:** *"…, no people, empty scene, photorealistic, cinematic, 35mm, [grade words]"*, 9:16.
- **Animals and props** that move (ravens, horses, boats, weapons): also on green so they can be animated separately.
- Budget: ~150 tokens/day ≈ 15–20 images. A 60 s video needs ~8–12 characters (+poses) and ~15–20 backgrounds.

## 9. Pipeline (in this repo: `flannan/`)

- `keyer.py`: green screen → trimmed RGBA cutouts in `cut/`, plus `offsets.json`.
- `characters.py`: per-character config (real face box, hat brim line, cartoon identity), `sprite()` and `clothes_parts()` (for the clothes-drop gag).
- `faces.py`: the cartoon head renderer. `EXPR` holds the expression presets and `random_identity()` makes the varied faces.
- `render.py`: the shot list (`SHOT()`), with `place()` for entrances and walks, `marker()`, `soft_text()`, `arc_text()`, `pointing_hand()`, `walkers()`, `fog()`, `rain()`, `camera()` push-in and `grade()`.
- `audio.py`: SFX/music placement. ElevenLabs sound generation goes through `api.elevenlabs.io/v1/sound-generation`.
- `build.sh`: render, SFX, then the ffmpeg mix with the voiceover (sidechain ducking, EQ, loudnorm).
- Voiceover: ElevenLabs `with-timestamps` gives `words.json`, which drives the captions and every timed beat.

Still to add for REF2 parity:
- mouth-flap talking
- tears, bloodshot, X and sleep eye states
- Z Z Z and stink-line props
- ghost mode
- pose swaps
- motion-blur sweeps
- the comic caption font with the countdown badge
- the Like & Subscribe sign gag

## 10. Pre-publish checklist

- [ ] First frame already shows the hook image; no black or empty opener.
- [ ] Every shot has motion; ≤ 10 % frozen frames (measure: mean abs frame diff < 0.6).
- [ ] Every face change maps to a word in `words.json`.
- [ ] No real face skin visible around any cartoon head.
- [ ] Every concrete noun is shown on screen when it's said.
- [ ] A visual SFX lands on every entrance, reveal and face change.
- [ ] The ending cuts on the punchline or the final number, so it loops.
- [ ] Facts checked; legends labelled as legends.
