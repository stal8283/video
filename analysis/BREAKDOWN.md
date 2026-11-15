# Frame-by-Frame Breakdown: "The Pink Prison Cell Experiment" & "Why the Second Draw Always Wins"

Both are vertical 720×1280 videos at 30 fps with AAC audio.

| | Pink Prison Cell | Second Draw |
|---|---|---|
| Length | 65.3 s (1,957 frames) | 56.2 s (1,682 frames) |
| Spoken words | ~237 | ~218 |
| Speaking pace | **~3.6 words/s (~220 wpm)** | **~3.9 words/s (~234 wpm)** |
| Distinct scenes | ~24 | ~20 |
| Average time per scene | ~2.7 s | ~2.8 s |
| Transition style | 6–10 frame cross-dissolve, nearly every time | Dissolves plus 4 "match" transitions and whips |
| Frames with fast motion (>4 px/frame) | 10.9 % | 9.7 % |
| Typical motion | 0.6 px/frame (slow drift) | 1.0 px/frame |

The data for every frame (brightness, contrast, saturation, warmth, pan, zoom, rotation, how much the frame changed) is in `data/*_per_frame.csv`. The timing of every word is in `data/*_word_timings.csv`. The contact sheets in `contact_sheets/` show one frame every 0.5 s with the timecode, and the `*_transitions_frame_by_frame.png` strips show every single frame across the important transitions.

---

## 1. The visual formula (shared by both videos)

**Art style.** Flat 2D characters sit inside lit 3D-rendered sets. The characters are stick figures with thick black outlines, big round white heads, simple dot or line faces and long thin legs. Each one has a single prop that says who they are (cap = guard, tie = scientist, hat colour = cowboy). The sets are soft, Pixar-like 3D with real light shafts, shadows, depth of field and bloom. That contrast does two jobs: the characters read instantly on a phone, and the world looks expensive.

**Captions.** There is one word, or at most two, on screen at a time. They're set in heavy white sans-serif with a black outline and a soft shadow, centred horizontally about **70 % down the frame**, just below the character's chest. That keeps them clear of the face and the platform UI. Each word appears on the exact frame the voice starts it, with no fade. Numbers are written as digits ("15", "300 lbs").

**Framing.** The subject is almost always in the centre third, with the head between 15 % and 45 % of frame height. The bottom 25 % is left as floor or ground so the caption sits on a clean, low-detail area.

**Each scene is one beat.** A new scene arrives on almost every clause of the script, roughly every 1.5–3.5 s. The picture shows the noun or verb being spoken right now: "pint of red" shows the pour, "truckload" shows a pink truck, "phone slid" shows the phone.

---

## 2. Camera movement: why it feels so smooth

Results from measuring motion on every frame:

1. **The camera is never fully still.** Almost every scene has a slow, steady **push-in** (positive zoom on nearly every scene) or a gentle drift of 0.3–1.5 px per frame. That's a slow dolly in, roughly 3–8 % scale over the scene, at constant speed with eased starts and stops.
2. **Motion is constant inside a scene.** The measured jerk (frame-to-frame change in motion) is very low on the hero shots, about 0.03 on the paint-mixing push and the pink-cell establisher. Spikes only happen on action beats on purpose.
3. **The motion continues through the dissolve.** The outgoing shot keeps pushing in while the incoming shot is already moving. There's never a hard stop, so the eye never "lands" and goes looking for a reason to scroll.
4. **Fast moves are saved for impact words**, and make up only about 10 % of frames:
   - Pink 38.7–41 s ("within a year"): the camera **cranes straight up** from the table, through the roof, into an aerial pass over farmland, then drops down to the prison yard. Flow peaks around 6 px/frame. This is the "time skip" move.
   - Pink 46.3 s: a **push through the monitor screen** into the cell (a screen-to-world match).
   - Draw 0.6–3 s: a muzzle flash, then the camera **follows the bullet** down the street to Slow Eddie.
   - Draw 14.0–15.1 s ("grab your gun"): a whip and push into the holster with speed lines and sparks. This is the largest frame change in the video.
   - Draw 44.0–45 s ("your body just did. But…"): a **push into the eye**. The pupil becomes a black circle, which becomes the round telegraph-office window. It's an iris match cut.
   - Draw 54.2 s: a **pull back out through the porthole** to the night street for the payoff.
5. **Rotation is almost zero.** There are no Dutch tilts except the fall in the duel montage. Keep the horizon level.

**Rules for your version:** every shot gets a slow push-in or a lateral drift. Use ease-in-out curves. Let the motion continue through 6–10 frame dissolves. Fast moves, at most one per 10 s, go on hook words.

---

## 3. Transitions (checked one frame at a time)

- **The default is a cross-dissolve of about 6–10 frames (0.2–0.33 s)**, which is about 85 % of all transitions. On the strips you can see both images blended at 50 % around frame 4–5. It's short enough to feel like a cut and soft enough to feel like one continuous dream.
- **The dissolve lands one word before the new noun.** The new picture is fully in on the frame its keyword is spoken. Example: pink, frame 1,712 → 1,722 is the "so" → "jails" dissolve.
- **Match transitions** (eye → window, screen → cell, bullet → street, sky → aerial) mark the big structural turns of the script.
- **There are no hard cuts** except on violent beats (gun draw, bench ripped out). The hard cut is itself the "impact" signal.

---

## 4. Lighting and colour grade: colour is the story

### Pink Prison Cell: cold institution vs. hot pink

| Time | Section | Brightness | Warmth | What the light is doing |
|---|---|---|---|---|
| 0–3 s | Hook: painting the cell | 84 (dark) | −43 (cold teal) | Dim blue-grey cell with a hard window light shaft. The one hot-pink stripe is the only saturated thing in the frame. |
| 3–11 s | Scientist mixes paint | 109 → 146 | −9 → +25 | Warm tungsten workshop; overhead product shot of the paint pour, red into white. |
| 8–11 s | First pink cell | 144 | +25 | Full magenta walls, cool overhead fluorescent. |
| 12–24 s | Guards, the rule, stopwatch | 140–158 | −33 to −47 | Cool, high-key, blue-teal cell block with sunlight through skylights. This is the "normal world". |
| 24–29 s | Biggest inmate in pink cell | 139 | +40 | Saturated pink, then **red veins/cracks** spreading as he flexes. Contrast drops and saturation rises. |
| 30–38 s | Arm wrestle | 114–128 | −40 | Back to cool blue, with dramatic sun shafts across the tables. |
| 39–43 s | "Within a year": aerial | 172 (brightest) | +30 | Bright daylight green/yellow countryside, then a pink truck. |
| 43–46 s | "One night" | drops to ~95 | −73 (coldest) | **Night blue**, a dissolve of 10 frames that darkens through blue. The guard is lit by a desk lamp and monitor. |
| 46–51 s | 15 → 20 min in the cell | 132 | +47, saturation peaks at 148 | The pink is pushed hotter and a **hard backlight with a large cast shadow** grows behind the prisoner. The lighting turns hostile. |
| 51–57 s | Explanation | 126–137 | ≈0 | A mix: cool corridor with a pink glow spilling out of the destroyed cell. |
| 57–63 s | Calm knitting | 164 | +29–36, saturation low at 68–78 | Soft, low-contrast pastel pink: the "safe" look. |
| 63–65 s | Twist ending | dark vignette | — | Background darkens, red veins return, a hard push-in on the face. |

The lighting logic is that **cool blue = rules / normal**, **soft pink = calm**, **saturated pink with hard shadows and red = danger**. The twist is told by the grade before the words say it.

### Second Draw: time of day as the arc

| Time | Section | Brightness | Warmth | Light |
|---|---|---|---|---|
| 0–14 s | Hook + setup at noon | 126–153 | −36 to −3 | Bright midday, saturated blue sky, short hard shadows, high key. |
| 14–21 s | Your draw / you lose | 147–155 | +16 | Sparks and fire glints, warm rim light on the action. |
| 21–36 s | Legend montage | 111–125 | **+33 to +51** | **Golden hour**: long shadows stretched across the street, orange haze. The "myth" section. |
| 36–44 s | Phone analogy (saloon) | **63–81** | +38–48, saturation 145–150 | Dark warm tungsten interior with practical lamps. Intimate "let me explain" lighting. |
| 44–51 s | "Decide" (telegraph office) | 86–98 | +19–29 | Teal walls with warm window light. The highest contrast (66–69): tension. |
| 51–56 s | Payoff | **58** (darkest) | **−66** (coldest), saturation 178 | **Moonlit night blue**. Everything goes cold and quiet for the reveal. |

The arc is noon → golden hour → indoor tungsten → night. Brightness falls steadily over the video (about 150 → 60) while saturation rises (about 100 → 178), so it gets more intense even as it gets darker.

**Shared lighting rules:**
- One motivated key light (window shaft, lamp, sun) with a visible beam or shadow. Soft fill and **bloom on the highlights**.
- Shallow depth of field. Backgrounds are slightly soft, so the flat characters stay crisp.
- Brightness in the light scenes sits around 130–160 out of 255. Shadows are lifted (the 5th percentile is rarely below 20), so it's never murky on a phone.
- The grade moves **towards an emotional extreme at the climax**: Pink goes to hot pink with hard shadow, Draw goes to cold moonlight.

---

## 5. Script structure: built for watch time

Both scripts follow the same skeleton almost exactly.

| Beat | Pink Prison Cell | Second Draw | Purpose |
|---|---|---|---|
| **Hook (0–3 s)**: a strange specific claim with a visual | "They painted the jail cell pink, and not just any pink." | "The fastest gun in the west had one rule: never draw first." | A contradiction or curiosity gap in under 3.5 s. |
| **Precise detail (3–11 s)** | "exactly one pint of red into a gallon of white… wrong shade" | "standing in the street at noon… a guy everyone calls Slow Eddie" | Oddly exact numbers and names make it feel true. |
| **Joke release (≈11–14 s)** | "Barbie's gonna love it in here." | "after you." | Humour around 12 s resets attention. |
| **Strange rule** | "exactly 15 minutes… stopwatch" | (Eddie stares at your hand, held back for later) | Plants the payoff variable. |
| **Second-person immersion** | — | "Imagine you're…", "you grab for your gun" | Puts the viewer inside the story. |
| **Impossible result (≈22–36 s)** | The biggest inmate loses an arm wrestle "in two seconds" | "You're face-down before it clears the holster" | Shock, then a question. |
| **Viewer's question said aloud** | "Wait, what?" | "How is that possible? Eddie isn't even fast!" | Says exactly what the viewer is thinking. |
| **Escalation / scale** | "jails all over the country… by the truckload" | "men ride in from three states away" | Raises the stakes; the time-skip visual. |
| **Turn ("Until one night…" / "The only weird thing…")** | A guard forgets the prisoner | Eddie never looks at your face | The second half opens a new loop. |
| **Countdown escalation** | "At 15… At 20… by the time they open the door" | — | Ticking-clock rhythm. |
| **Explanation ("You see…")** | "You see, the scientist swore…" | "You see, think about the last time your phone slid…" | The same phrase opens the payoff in both. |
| **Relatable analogy** | — | Catching a falling phone | Makes the science feel obvious. |
| **Twist and end** | "It only works for 15 minutes. Any longer… the exact opposite." | "lets his body react on its own." | Ends right on the reveal, with **no outro or CTA**. The last frame is still in motion, which encourages loops and rewatches. |

**Pacing.**
- About 220–235 wpm, which is fast. Pauses are rarely longer than 0.3 s, and the longest pauses (0.3–0.38 s) come right **after a punchline or before a turn**: "pink," / "Barbie" / "Wait, what?" / "sitting quietly." / "Eddie isn't even fast!"
- Sentences are short and stack with "So…", "But…", "Then…", "Until…". Each one opens a new loop before the last one is fully closed.
- Concrete numbers repeat (15 minutes ×5, "exactly" ×3) as anchors.
- There's a **retention re-hook about every 7–10 s**, at roughly 11 s, 22 s, 36 s, 42 s, 52 s and 60 s.
- Neither video says "subscribe" or "follow". The end is the twist, and the screen cuts out while the action is still happening.

**The voice** is a single male narrator: warm, conversational, slightly wry, speaking fast but clearly. The jokes are delivered deadpan.

---

## 6. Shot list template for your version (about 60 s, 30 fps)

| # | Time | Frames | Script beat | Shot | Camera | Light | Transition out |
|---|---|---|---|---|---|---|---|
| 1 | 0–3.5 | 0–105 | Hook: strange claim | Character doing the strange act, plus one saturated "key colour" object | Slow push-in, or an action follow-cam | Dark/cool with a single colour accent | 8f dissolve |
| 2 | 3.5–8 | 105–240 | Precise detail | Insert / overhead product shot | Top-down slow push and rotate | Warm practical light | 8f dissolve |
| 3 | 8–11 | 240–330 | Result of the detail | Wide establisher | Push-in | Key colour full frame | 8f dissolve |
| 4 | 11–14 | 330–420 | Joke | Two characters reacting | Lateral drift | Neutral high key | 8f dissolve |
| 5 | 14–22 | 420–660 | The rule / setup | Mid, then a **close-up on the prop** (stopwatch / hand) | Push-in, snap to CU on the number | Cool "normal world" | 8f dissolve |
| 6 | 22–30 | 660–900 | Test / confrontation | Character in the key-colour space | Push-in; FX build (veins, sparks) | Saturation rising | Hard cut or whip on impact |
| 7 | 30–36 | 900–1080 | Impossible result | Group wide shot, action | Static-ish drift | Dramatic sun shafts | 8f dissolve |
| 8 | 36–38 | 1080–1140 | "Wait, what?" | Reaction close-up | Micro push | Same | **Big move** |
| 9 | 38–43 | 1140–1290 | Escalation / time skip | Crane up to aerial, then down | Fast crane, eased | Brightest frame in the video | 10f dissolve to dark |
| 10 | 43–52 | 1290–1560 | Turn: "Until one night…" | New space, ticking clock | Push through a screen, window or eye | Night / tungsten, high contrast | Match transition |
| 11 | 52–58 | 1560–1740 | "You see…" explanation / analogy | Calm explainer two-shot | Slow drift | Mixed | 8f dissolve |
| 12 | 58–65 | 1740–1950 | Twist | Calm, then a sudden flip on the last word | Slow, then a fast push-in on the final word | Grade flips to the extreme | **End on motion** |

**Production checklist**
- [ ] Export at 1080×1920 (the originals are 720×1280; go higher), 30 fps constant frame rate.
- [ ] Every shot has easing on its motion; there are no locked-off shots.
- [ ] Default transition is a 6–10 frame cross-dissolve, timed so the new image is fully in on its keyword.
- [ ] Captions are one word at a time, synced to the exact frame, about 70 % down, in white heavy type with a black outline.
- [ ] A visual change at least every 3.5 s, and a re-hook line every 7–10 s.
- [ ] One "key colour" that carries the meaning, with the grade arc pushing to an extreme at the twist.
- [ ] The voiceover is about 220 wpm, with 0.3 s pauses only after jokes and before turns.
- [ ] No outro or CTA. End on the reveal word while the action is still moving.
