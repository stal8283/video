# "Do Not Call 911": car-in-water short (Remotion + Three.js)

A 1080×1920, 30 fps vertical short built in the style analysed in `../analysis/BREAKDOWN.md`:
- characters matched to the reference: egg heads, thick outlines, bean bodies, noodle arms with ball hands, set in lit 3D scenes
- constant eased camera motion with 8-frame cross-dissolves
- one-word captions timed to the voiceover
- a lighting arc from a rainy night to murky green water to a golden-hour surface

## Pipeline
1. **Script**: `src/script.ts`. Each scene is anchored to a phrase in the script, so the visuals re-sync automatically whenever the voiceover changes.
2. **Voiceover (local, no API key)**: `python3 scripts/voice.py <kokoro_model_dir> [voice=am_michael] [speed=1.28]`
   Narration comes from the open-source Kokoro TTS model (kokoro-onnx), generated sentence by sentence with reference-style pauses.
   Word timings come from faster-whisper, aligned back to the script. The script writes `public/voiceover.wav` and `public/voiceover.json`.
   (Optional alternative: `scripts/voiceover.mjs` uses ElevenLabs if you have a key.)
3. **Sound design + music**: `python3 scripts/sfx.py` synthesizes every effect from scratch (rain, engine, horn, crash, tyre screech, splashes,
   9-1-1 DTMF + ringback, thuds, stopwatch ticks, siren, seatbelt click, window motor, glass shatter, underwater, bubbles, whooshes) plus
   a tension music bed that ducks under the voice. Each cue is placed on the spoken words, and the mix is written to `public/sfx.wav`.
4. **Preview stills**: `node scripts/stills.mjs [frame ...]`
5. **Render**: `npx remotion render src/index.ts CarInWater out/car-in-water.mp4`
   (uses software WebGL, "swangle", so it renders on machines without a GPU)

## Fact basis
These follow Prof. Gordon Giesbrecht's sinking-vehicle research (University of Manitoba): there's roughly a one-minute floating window, emergency response times are often longer than 8 minutes, and the protocol is Seatbelts, Windows, Children, Out. Don't spend that first minute on a 911 call. Break a side window, not the laminated windshield.
