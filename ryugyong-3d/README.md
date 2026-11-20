# Starter project

A Remotion 4 project for vertical (1080×1920, 30 fps) 3D cartoon Shorts.

```bash
npm install
python plan/plan_src.py                      # writes src/plan.gen.ts, plan.json, PLAN.md from vo/timings.json
npx remotion studio src/index.ts             # browse every composition live
```
Render through the skill's scripts (they pick the settings for your PC): `preview.py`, `render.py`, `qa.py`.

| composition | what |
|---|---|
| Short / ShortSub | the plan-driven Short (src/short/Short.tsx); ShortSub = 4× sub-frames for heavy motion blur |
| SetRoom, SetClassroom, SetForest, SetOldTown | the ready sets with a character, in their light |
| Demo, DemoHero, DemoWide, Demo-<mood> | the street set in each mood (day, dusk, night, cold, lamp, golden) |
| DemoCast | the original three characters in one light (landscape) |
| Gestures | the finger hands (landscape) |
| DemoMove / DemoMoveSub | a 3 s beat-rig move |

| path | what |
|---|---|
| `src/short/Short.tsx` | the video: cast, blocking, base lens per shot, scene content, LOOK |
| `plan/plan_src.py` | the plan, anchored to words: shots, beats, SFX, accent words, tags |
| `src/engine/core/` | View (canvas, lights, post, style, quality, motion blur), rig (beats), short (plan-driven camera), anim (cartoon physics, expressions, walk), quality (presets + styles), captions, ik, moods, shots, kit |
| `src/engine/char/` | Character3D, hands (gestures), cast, family, face, clothes, hand props |
| `src/engine/sets/` | props library + ready sets |
| `src/engine/fx/` | rain, snow, leaves, dust, sparks, embers, confetti, steam, light beams |
| `src/engine/post/` | the post chain: normals/depth → edges → AO → bloom → grade + ink → DOF → motion blur → final |
| `src/engine/mat/` | painted toon materials, sky |
| `public/vo/voice.wav` | the voice (written by vo_prep.py) |
| `public/fonts/` | Poppins (SIL OFL 1.1) |
