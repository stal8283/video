// THE SHORT. A complete, working example of a plan-driven vertical Short: the shots, beats, captions, tags and sounds
// all come from src/plan.gen.ts (written by plan/plan_src.py from the voice-over's word timings).
// For a new video, keep this structure and replace: the cast and blocking (who stands where, what they do), baseCam
// (the resting lens of each shot id) and the scene content per set. Never type a time: anchor it in plan_src.py.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { CAST } from "../engine/char/cast";
import { Character3D, headOf } from "../engine/char/Character3D";
import { EXPRESSIONS, hop, walkAlong } from "../engine/core/anim";
import { Captions, makeChunks } from "../engine/core/captions";
import type { Word } from "../engine/core/captions";
import { CastLight } from "../engine/core/castLight";
import { subFrame, useFonts } from "../engine/core/frame";
import { holdInFront } from "../engine/core/ik";
import { boxG, Label, M, sphG } from "../engine/core/kit";
import { moodOf } from "../engine/core/moods";
import type { Style } from "../engine/core/quality";
import { aim, withShake } from "../engine/core/rig";
import type { Cam } from "../engine/core/rig";
import { shortCam } from "../engine/core/short";
import { medium } from "../engine/core/shots";
import { View } from "../engine/core/View";
import { Dust, Steam } from "../engine/fx/particles";
import type { V3 } from "../engine/types";
import { Crate, Street } from "../demo/Street";
import { ACCENT_WORDS, BEATS, DURATION, FPS, HAS_VOICE, SFX, SHOTS, TAGS, WORDS } from "../plan.gen";

// ---- the look of this video (the person picks it in the intake questions)
export const LOOK: Style = "ink";

// ---- word lookup for acting cues (the camera and cuts come from the plan; acting reads the same words)
const at = (w: string, occ = 1) => {
  let k = 0;
  for (const x of WORDS) if (x[0].toLowerCase().replace(/[^a-z]/g, "") === w && ++k === occ) return x[1];
  return 0;
};
const CHUNKS = makeChunks(WORDS as unknown as Word[], DURATION / FPS);
const END = DURATION / FPS;

// ---- blocking (sidewalk top y = 0.16)
const Y = 0.16;
const KID = CAST.kid;
const ELDER = { ...CAST.elder, look: { ...CAST.elder.look, hairColor: "#7f8594" } }; // a darker cool silver reads against warm skin at golden hour
const ELDER_P: V3 = [1.45, Y, -3.25];
const ELDER_YAW = -1.15;
const KID_PATH: V3[] = [[-2.0, Y, -3.0], [0.25, Y, -3.0]];
const kidWalk = (t: number) => walkAlong(t, KID_PATH, { speed: 0.85, height: KID.height });
const CRATE_P: V3 = [2.3, Y, -3.35];
const LOAF_P: V3 = [CRATE_P[0], Y + 0.6 + 0.07, CRATE_P[2]];
const ELDER_HEAD = headOf(ELDER_P, ELDER.height, ELDER.build);

// ---- the resting lens of each shot (a pure function of t: it may follow a walking character)
const baseCam = (id: string, t: number): Cam => {
  if (id === "S01") {
    const head = headOf(kidWalk(t).pos, KID.height, KID.build);
    // the lens leads the walk (ahead and to the side): we see the face, and the lamp post stays behind the kid
    return aim([head[0] + 0.7, 1.0, -3.0 + 2.6], head, 50, 0.42);
  }
  if (id === "S02") return medium({ feet: ELDER_P, height: ELDER.height, facing: ELDER_YAW, side: 38 }).cam;
  return aim([0.75, 1.15, 0.9], [0.8, 1.05, -3.1], 54, 0.42);
};
const camAt = (t: number) => {
  const c = shortCam(t, SHOTS, BEATS, baseCam, 0.85); // big moves ≥ 0.85 s (faster ones strobe)
  return { ...c, cam: withShake({ ...c.cam, roll: c.cam.roll ?? 0 }, c.shake) };
};

const Loaf: React.FC<{ t: number }> = ({ t }) => (
  <group position={LOAF_P}>
    <M g={boxG(0.62, 0.04, 0.4)} c="#c8a878" tex="wood" />
    <M g={sphG(0.16, 22)} c="#d88a3a" p={[0, 0.09, 0]} s={[1.55, 0.62, 0.9]} />
    {[-0.1, 0, 0.1].map((x) => (
      <M key={x} g={boxG(0.025, 0.012, 0.12)} c="#f4d29a" p={[x, 0.19, 0]} r={[0, 0.5, 0]} cast={false} />
    ))}
    <Steam at={[0, 0.17, 0]} t={t} count={12} rise={0.3} size={1.4} />
    {TAGS.map((tg) => (
      <Label key={tg.text} text={tg.text} p={[0, 0.42, -0.16]} w={0.5} h={0.18} fg="#3a1f12" bg="#ffe6b0" font={0.7} />
    ))}
  </group>
);

export const Short: React.FC<{ sub?: boolean }> = ({ sub = false }) => {
  const ready = useFonts();
  const g = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const { n, fp } = sub ? subFrame(g) : { n: g, fp: g };
  const t = fp / FPS;
  const { cam, shot } = camAt(t);
  const camPrev = camAt(Math.max(0, t - 1 / FPS)).cam; // camera motion blur
  const m = moodOf(shot.mood);

  // the kid walks in (phase matched to the stride: no sliding), stops, hops on "warm"
  const wk = kidWalk(t);
  const jump = hop(t, at("warm"), 0.5, 0.12);
  const kidP: V3 = [wk.pos[0], Y + jump.y, wk.pos[2]];
  const excited = t > at("warm") - 0.1;
  const kidHead = headOf(kidP, KID.height, KID.build);
  // grandma holds the cocoa at chest height (IK), nods on "ready"
  const hold = holdInFront({ position: ELDER_P, yaw: ELDER_YAW, height: ELDER.height, build: ELDER.build, side: "R", up: 0.5, forward: 0.2 });
  const nod = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - at("ready")) / 0.5))) * 8;
  const focus = shot.id === "S01" ? kidHead : shot.id === "S02" ? ELDER_HEAD : ([0.85, 1.15, -3.1] as V3);

  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} camPrev={camPrev} t={t} focus={focus} blur={1.3} look={LOOK}>
        <Street lamp={0.3} />
        <Crate p={CRATE_P} s={0.6} yaw={0.15} />
        <Loaf t={t} />
        <Dust center={[0.8, 1.4, -3.4]} size={[4, 2.4, 2]} t={t} count={80} glow={0.6} />
        <Character3D
          {...KID}
          position={kidP}
          yaw={wk.moving ? wk.yaw : Math.PI / 2 + 0.15}
          t={t}
          squash={jump.squash}
          face={excited ? EXPRESSIONS.excited : { ...EXPRESSIONS.happy, look: 0.1 }}
          pose={{ walk: wk.moving ? wk.phase : undefined, ...(excited ? { armL: [125, 25], armR: [125, 25] } : wk.moving ? {} : { armL: [12, 15], armR: [12, 15] }), headTilt: wk.moving ? 0 : -6 }}
          hands={excited ? { L: "open", R: "open" } : undefined}
          faceCamera={cam.pos}
          faceCameraAmount={0.35}
        />
        <Character3D
          {...ELDER}
          position={ELDER_P}
          yaw={ELDER_YAW}
          t={t}
          face={{ ...EXPRESSIONS.happy, look: -0.1 }}
          pose={{ ...hold.pose, armL: [14, 20], headTilt: 5, headNod: nod }}
          hold="mug"
          holdSide="R"
          faceCamera={cam.pos}
          faceCameraAmount={0.3}
        />
        <Steam at={[hold.hand[0], hold.hand[1] + 0.1, hold.hand[2] + 0.05]} t={t} count={8} rise={0.18} />
        <CastLight at={kidHead} cam={cam.pos} mood={m} />
        <CastLight at={ELDER_HEAD} cam={cam.pos} mood={m} />
      </View>
      <Captions chunks={CHUNKS} t={n / FPS} accent={new Set(ACCENT_WORDS)} accentColor="#ffd34a" until={END} />
      {!sub && HAS_VOICE ? <Audio src={staticFile("vo/voice.wav")} /> : null}
      {!sub
        ? SFX.map((s, i) => (
            <Sequence key={i} from={Math.round(s.t * FPS)}>
              <Audio src={staticFile(s.file)} volume={Math.pow(10, (s.db - 8) / 20)} />
            </Sequence>
          ))
        : null}
    </AbsoluteFill>
  );
};
