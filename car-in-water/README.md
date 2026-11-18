# "Do Not Call 911": car-in-water short (Remotion + Three.js)

A 1080×1920, 30 fps vertical short built in the style analysed in `../analysis/BREAKDOWN.md`:
- characters matched to the reference: egg heads, thick outlines, bean bodies, noodle arms with ball hands, set in lit 3D scenes
- constant eased camera motion with 8-frame cross-dissolves
- one-word captions timed to the voiceover
- a lighting arc from a rainy night to murky green water to a golden-hour surface

## Pipeline
1. **Script**: `src/script.ts`. Each scene is anchored to a phrase in the script, so the visuals re-sync automatically whenever the voiceover changes.
2. **Voiceover (ElevenLabs)**: `NODE_USE_ENV_PROXY=1 ELEVENLABS_API_KEY=... node scripts/voiceover.mjs [voiceId]`
   Uses the voice "Liam" with `eleven_multilingual_v2` at speed 1.2, and word timings from `/with-timestamps`.
   Then `python3 scripts/tighten.py` trims pauses longer than about 0.4 s (keeping the punchline beats) and writes `public/voiceover.wav` + `voiceover.json`.
   (Offline fallback: `scripts/voice.py` uses the local Kokoro TTS.)
3. **Sound effects + music (ElevenLabs)**: `python3 scripts/sfx_gen.py` generates 30 cues with the sound-effects API, cached in `public/sfx11/`:
   rain, car interior, tyre screech, truck horn, crash, guardrail, splashes, phone dial/ring, water filling, door thuds,
   metal groans, stinger, stopwatch, pressure rumble, siren, seatbelt, window motor, water gush, glass smash, underwater, surface gasp, whooshes,
   plus two music beds. The dispatcher line is ElevenLabs TTS ("Sarah"), filtered to sound like a phone.
   `python3 scripts/mix11.py` places every cue on its spoken word, loops the ambiences, crossfades the music
   (calm, then tense, then cut for "Wait, what?"), ducks everything under the narration, and writes `public/sfx.wav`.
4. **Preview stills**: `node scripts/stills.mjs [frame ...]`
5. **Render**: `npx remotion render src/index.ts CarInWater out/car-in-water.mp4`
   (uses software WebGL, "swangle", so it renders on machines without a GPU)

## Fact basis
These follow Prof. Gordon Giesbrecht's sinking-vehicle research (University of Manitoba): there's roughly a one-minute floating window, emergency response times are often longer than 8 minutes, and the protocol is Seatbelts, Windows, Children, Out. Don't spend that first minute on a 911 call. Break a side window, not the laminated windshield.
