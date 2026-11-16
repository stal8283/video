# "Do Not Call 911": car-in-water short (Remotion + Three.js)

A 1080×1920, 30 fps vertical short built in the style analysed in `../analysis/BREAKDOWN.md`:
- flat stick-figure characters in lit 3D sets
- constant eased camera motion with 8-frame cross-dissolves
- one-word captions timed to the voiceover
- a lighting arc from a rainy night to murky green water to a golden-hour surface

## Pipeline
1. **Script**: `src/script.ts`. Each scene is anchored to a phrase in the script, so the visuals re-sync automatically whenever the voiceover changes.
2. **Voiceover (ElevenLabs)**: `ELEVENLABS_API_KEY=... node scripts/voiceover.mjs [voiceId]`
   writes `public/voiceover.mp3` and `public/voiceover.json` (word timings from the `/with-timestamps` endpoint).
   Without a key, `node scripts/estimate-timings.mjs` writes approximate timings so you can preview the video silently.
3. **Preview stills**: `node scripts/stills.mjs [frame ...]`
4. **Render**: `npx remotion render src/index.ts CarInWater out/car-in-water.mp4`
   (uses software WebGL, "swangle", so it renders on machines without a GPU)

## Fact basis
These follow Prof. Gordon Giesbrecht's sinking-vehicle research (University of Manitoba): there's roughly a one-minute floating window, emergency response times are often longer than 8 minutes, and the protocol is Seatbelts, Windows, Children, Out. Don't spend that first minute on a 911 call. Break a side window, not the laminated windshield.
