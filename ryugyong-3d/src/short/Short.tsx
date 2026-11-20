// THE SHORT: "The Hotel That Has Never Had a Single Guest" (vertical, 3D, ink look).
// Shots, beats, captions and tags come from src/plan.gen.ts (plan/plan_src.py, anchored to the voice-over's words).
// Acting, set animation and sounds read the same words through at(). Every frame is a pure function of t.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Character3D, headOf } from "../engine/char/Character3D";
import type { CharacterSpec, FaceState } from "../engine/char/Character3D";
import { EXPRESSIONS, hop, key, walkAlong } from "../engine/core/anim";
import { Captions, makeChunks } from "../engine/core/captions";
import type { Word } from "../engine/core/captions";
import { CastLight } from "../engine/core/castLight";
import { subFrame, useFonts } from "../engine/core/frame";
import { holdInFront } from "../engine/core/ik";
import { boxG, cylG, Label, M, Smoke } from "../engine/core/kit";
import { moodOf } from "../engine/core/moods";
import type { Style } from "../engine/core/quality";
import { poseAt, withShake } from "../engine/core/rig";
import type { Beat, Cam } from "../engine/core/rig";
import { shotIndex } from "../engine/core/short";
import { View } from "../engine/core/View";
import { Confetti, Dust, Leaves } from "../engine/fx/particles";
import type { V3 } from "../engine/types";
import { ACCENT_WORDS, BEATS, DURATION, FPS, HAS_VOICE, SHOTS, WORDS } from "../plan.gen";
import { BUILDER, CLERK, DOORMAN, EXEC, FITTER, GUEST, PASSER } from "./cast";
import { CUES, BEDS } from "./sfx";
import { at } from "./words";
import { CLERK_WORDS, GUEST_WORDS, LOUD } from "./speech.gen";
import { Boulevard, PYR_Z, WALK_Y } from "./world/Boulevard";
import { DESK_Z, Lobby } from "./world/Lobby";
import { Pyramid3D } from "./world/Pyramid3D";
import { Singapore } from "./world/Singapore";
import { Table, TOP } from "./world/Table";

export const LOOK: Style = "ink";
const END = DURATION / FPS;
const CHUNKS = makeChunks(WORDS as unknown as Word[], END);
const ACC = new Set(ACCENT_WORDS);

// ---------------------------------------------------------------- word anchors (acting reads the same words as the plan)
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (u: number) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const eOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);

/** a speaking character's mouth: from the voice's loudness, leading the audio by 2 frames, only during its words */
const mouthOf = (t: number, words: [string, number, number][], rest: FaceState["mouth"]): FaceState["mouth"] => {
  const lead = 2 / FPS;
  if (!words.some(([, a, b]) => t + lead >= a && t + lead <= b + 0.04)) return rest;
  const f = Math.round((t + lead) * FPS);
  const l = Math.max(LOUD[f] ?? 0, LOUD[f + 1] ?? 0);
  return l < 0.1 ? "flat" : l < 0.4 ? "o" : "open";
};

// ---------------------------------------------------------------- the camera: per-shot base lens + its beats; push-through between sets
const SETS = Object.fromEntries(SHOTS.map((s) => [s.id, s.set]));
const shotCam = (i: number, t: number) => {
  const s = SHOTS[i];
  const own = BEATS.filter((b) => b.t >= s.t - 0.3 && b.t < s.end - 0.05);
  const B: Beat[] = own.map((b) => ({ t: b.t, move: b.move, dur: (b.prm as { dur?: number }).dur ?? 0, word: b.word }));
  const p = poseAt(baseCam(s.id, t), B, s.t, t, own.map((b) => ({ ...(b.prm as object) })));
  return { cam: { pos: p.pos, look: p.look, fov: p.fov, roll: p.roll } as Cam, shake: p.shake };
};
const SWAP = 2 / FPS; // the new set appears 2 frames before its word
/** camera + which shot's set is on screen + a transition blur (px) */
const camAt = (t: number) => {
  let i = shotIndex(t + SWAP, SHOTS);
  const s = SHOTS[i];
  let cam = shotCam(i, t).cam;
  let blur = 0;
  // push-through: the outgoing shot punches in over 9 frames, the incoming one lands from a tighter lens over 10
  const nxt = SHOTS[i + 1];
  if (nxt && SETS[nxt.id] !== s.set) {
    const tb = nxt.t - SWAP;
    const u = clamp((t - (tb - 0.3)) / 0.3);
    if (u > 0) { cam = { ...cam, fov: cam.fov * (1 - 0.28 * ease(u)) }; blur = 10 * ease((u - 0.6) / 0.4); }
  }
  if (i > 0 && SETS[SHOTS[i - 1].id] !== s.set) {
    const tb = s.t - SWAP;
    const u = clamp((t - tb) / 0.34);
    if (u < 1) { cam = { ...cam, fov: cam.fov * (0.74 + 0.26 * eOut(u)) }; blur = Math.max(blur, 10 * (1 - eOut(u / 0.35))); }
  } else if (i > 0) {
    // same set (S11 -> S12): blend the lenses over 0.85 s
    const t0 = s.t - 0.85 * 0.85;
    const u = clamp((t - t0) / 0.85);
    if (u < 1) {
      const a = shotCam(i - 1, t).cam, b = cam, e = ease(u);
      const mx = (p: V3, q: V3): V3 => [p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e, p[2] + (q[2] - p[2]) * e];
      cam = { pos: mx(a.pos, b.pos), look: mx(a.look, b.look), fov: a.fov + (b.fov - a.fov) * e, roll: 0 };
    }
  }
  const sh = shotCam(i, t).shake;
  return { cam: withShake({ ...cam, roll: cam.roll ?? 0 }, sh), shot: s, index: i, blur };
};

// ---------------------------------------------------------------- blocking
const Y = WALK_Y;
const GUEST_PATH: V3[] = [[-2.6, Y, 0.6], [0.2, Y, 0.6]];
const guestWalk = (t: number) => walkAlong(t, GUEST_PATH, { speed: 1.05, height: GUEST.height });
// lobby
const CLERK_P: V3 = [1.55, 0, DESK_Z - 0.6];
const GUEST_L: V3 = [-0.55, 0, -0.95];
const EXEC_L: V3 = [-0.45, 0, -0.95];
const EXEC_OUT: V3[] = [EXEC_L, [-2.2, 0, -0.2], [-4.6, 0, 1.6]];
// table / singapore
const DOOR_P: V3 = [1.1, 0.12, -2.4];

// ---------------------------------------------------------------- the resting lens of each shot
const baseCam = (id: string, t: number): Cam => {
  switch (id) {
    case "S01": { const h = headOf(guestWalk(t).pos, GUEST.height, GUEST.build); return { pos: [1.7, 0.75, 4.6], look: [h[0] * 0.3 - 0.2, 3.4, -6], fov: 72, roll: 0 }; }
    case "S02": return { pos: [2.6, 2.3, -1.25], look: [3.4, 2.92, -3.45], fov: 48, roll: 0 };
    case "S03": return { pos: [3.0, 1.1, 4.4], look: [0.4, 4.2, -8], fov: 72, roll: 0 };
    case "S04": return { pos: [0.05, 1.62, 1.15], look: [0.0, TOP, -0.05], fov: 58, roll: 0 };
    case "S05": return { pos: [0.3, 0.9, 4.2], look: [0.2, 5.2, -10], fov: 74, roll: 0 };
    case "S06": return { pos: [0.15, 1.12, 1.05], look: [0.05, TOP + 0.3, 0], fov: 52, roll: 0 };
    case "S07": return { pos: [1.6, 0.95, 4.6], look: [-0.3, 4.0, -8], fov: 70, roll: 0 };
    case "S08": return { pos: [-1.8, 1.25, 4.8], look: [0.6, 3.8, -8], fov: 70, roll: 0 };
    case "S09": return { pos: [2.2, 0.9, 4.7], look: [-0.2, 4.4, -8], fov: 70, roll: 0 };
    case "S10": return { pos: [0.2, 1.3, 1.0], look: [0.0, TOP + 0.24, 0], fov: 50, roll: 0 };
    case "S11": return { pos: [0.3, 1.5, 2.9], look: [0.45, 1.22, -1.6], fov: 58, roll: 0 };
    case "S12": return { pos: [-0.2, 1.55, 2.6], look: [0.55, 1.25, -1.6], fov: 56, roll: 0 };
    default: return { pos: [1.7, 0.75, 4.6], look: [0.0, 3.6, -6], fov: 72, roll: 0 }; // S13 = the opening lens
  }
};

// ---------------------------------------------------------------- small props
const Suitcase: React.FC<{ p: V3; yaw: number; handle?: boolean }> = ({ p, yaw, handle = true }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(0.42, 0.58, 0.24)} c="#8a5a34" tex="fabric" p={[0, 0.35, 0]} />
    <M g={boxG(0.44, 0.06, 0.26)} c="#6e4726" p={[0, 0.35, 0]} />
    <Label text="SG" p={[0.05, 0.42, 0.125]} w={0.12} h={0.1} fg="#1a1416" bg="#e7d7a8" font={0.7} />
    {[-0.15, 0.15].map((x) => <M key={x} g={cylG(0.035, 0.035, 0.03, 12)} c="#222" p={[x, 0.035, 0.08]} r={[0, 0, Math.PI / 2]} />)}
    {handle ? <M g={cylG(0.012, 0.012, 0.42, 8)} c="#2a2a2a" p={[0, 0.85, -0.06]} /> : null}
  </group>
);
const SovietBanner: React.FC<{ fall: number }> = ({ fall }) => {
  const k = clamp(fall);
  return (
    <group position={[2.9, Y, -1.4]}>
      <M g={cylG(0.06, 0.07, 4.6, 10)} c="#3a3a3a" tex="metal" p={[0, 2.3, 0]} />
      <group position={[0.85, 3.9 - k * k * 3.1, 0]} rotation={[0, 0, k * 1.2]}>
        <M g={boxG(1.6, 1.0, 0.03)} c="#a8322e" tex="fabric" />
        <Label text="USSR" p={[0.1, -0.05, 0.02]} w={1.2} h={0.5} fg="#d9b54a" bg="none" font={0.8} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- per-set scenes
type SceneProps = { t: number; id: string; cam: Cam };
const BoulevardScene: React.FC<SceneProps> = ({ t, id, cam }) => {
  const night = id === "S01" || id === "S03" || id === "S13";
  const era = night ? "night" : id === "S08" ? "cold" : "day";
  // the pyramid's state per act
  const ledOn = id === "S01" ? 1 : id === "S03" ? eOut((t - at("lights") + 0.1) / 0.6) : id === "S13" ? eOut((t - at("switch") + 0.08) / 0.7) : 0;
  const w0 = at("work"), gaps = [0, 10, 15, 18, 21, 24, 26, 28, 30, 32].map((g) => w0 + g / FPS);
  const rise = id === "S07" ? 0.2 + 0.8 * (gaps.filter((g) => t >= g).length / 10) : 1;
  const dropAt = id === "S07" ? (k: number) => { const g = gaps[Math.max(0, Math.round((k / 10 - 0.2) / 0.08) - 1)] ?? 0; return k >= 2 ? Math.max(0, 1 - eOut((t - g) / 0.2)) : 0; } : undefined;
  const glassRise = id === "S09" ? Math.pow(clamp((t - at("egyptian")) / (at("glass") - at("egyptian"))), 0.7) : 0;
  const state = night ? "lit" : id === "S09" && glassRise >= 1 ? "glass" : "concrete";
  // cast
  const gw = guestWalk(t);
  const gHead = headOf(gw.pos, GUEST.height, GUEST.build);
  const shocked = id === "S03" && t > at("lights") - 0.1;
  const collapsed = id === "S08" ? clamp((t - at("collapsed") + 0.2) / 0.4) : 0;
  return (
    <>
      <Boulevard era={era} lamps={night ? 1 : 0}>
        <group position={[0, 0, PYR_Z]}>
          <Pyramid3D H={135} state={state} t={t} ledOn={ledOn} rise={rise} dropAt={dropAt} glassRise={glassRise}
            crane={id === "S07" || id === "S08" || (id === "S09" && glassRise < 1)} craneStencil={id === "S08" ? "1992" : undefined} />
        </group>
      </Boulevard>
      {id === "S01" || id === "S13" ? (
        <>
          {id === "S01" ? <Suitcase p={[gw.pos[0] - 0.55, Y, gw.pos[2] + 0.05]} yaw={0.1} /> : <Suitcase p={[-0.45, Y, 0.75]} yaw={0.35} />}
          <Character3D {...GUEST} position={id === "S01" ? gw.pos : [0.2, Y, 0.6]} yaw={id === "S01" ? (gw.moving ? gw.yaw : Math.PI * 0.85) : Math.PI * 0.95} t={t}
            face={id === "S13" ? (t > at("switch") ? { ...EXPRESSIONS.surprised, look: 0.2 } : EXPRESSIONS.thinking) : { ...EXPRESSIONS.happy, look: 0.3 }}
            pose={{ walk: id === "S01" && gw.moving ? gw.phase : undefined, armL: id === "S01" && gw.moving ? [24, 12] : [12, 14], armLFwd: -10, headNod: id === "S13" ? -14 : -6 }}
            hands={{ L: "grip" }} faceCamera={cam.pos} faceCameraAmount={id === "S13" ? 0.2 : 0.35} />
          <CastLight at={id === "S01" ? gHead : headOf([0.2, Y, 0.6], GUEST.height, GUEST.build)} cam={cam.pos} mood={moodOf("night")} />
        </>
      ) : null}
      {id === "S03" ? (
        <>
          <Character3D {...PASSER} position={[1.1, Y, -0.6]} yaw={Math.PI * 0.82} t={t}
            face={shocked ? EXPRESSIONS.surprised : { ...EXPRESSIONS.neutral, look: -0.2 }}
            pose={{ headNod: shocked ? -18 : -4, armR: shocked ? [40, 70] : [10, 12], armL: [10, 12] }} hands={shocked ? { R: "open" } : undefined}
            faceCamera={cam.pos} faceCameraAmount={0.3} />
          <CastLight at={headOf([1.1, Y, -0.6], PASSER.height, PASSER.build)} cam={cam.pos} mood={moodOf("night")} />
        </>
      ) : null}
      {id === "S07" ? (
        <>
          <Character3D {...BUILDER} position={[-1.1, Y, 0.3]} yaw={0.4} t={t} face={{ ...EXPRESSIONS.happy, look: 0.3 }}
            pose={{ armR: t > at("starts") ? [150, 10] : [30, 40], headNod: -10 }} hands={{ R: t > at("starts") ? "point" : "relaxed" }} hold="scroll" holdSide="L"
            faceCamera={cam.pos} faceCameraAmount={0.3} />
          {gaps.map((g, i) => (t >= g && t < g + 0.8 ? <Smoke key={i} p={[0, (0.2 + 0.08 * (i + 1)) * 0.82 * 135, PYR_Z + 6]} s={8} t={t - g} seed={i} n={4} color="#c8b898" /> : null))}
        </>
      ) : null}
      {id === "S08" ? (
        <>
          <SovietBanner fall={collapsed} />
          <Character3D {...BUILDER} position={[-1.0, Y, 0.4]} yaw={0.5} t={t}
            face={t > at("then") + 0.3 ? EXPRESSIONS.sad : EXPRESSIONS.surprised} pose={{ headNod: t > at("sixteen") ? 12 : 0, armL: [8, 10], armR: [8, 10] }}
            faceCamera={cam.pos} faceCameraAmount={0.35} />
          <Leaves center={[0, 2, 0]} size={[12, 5, 8]} t={t} count={50} colors={["#8a7a6a", "#a89a80", "#6e665c", "#c8bca4"]} wind={1.4} />
          {collapsed >= 1 && t < at("collapsed") + 1.0 ? <Smoke p={[3.75, Y + 0.3, -1.4]} s={1.2} t={t - at("collapsed")} n={5} color="#b8aa98" /> : null}
        </>
      ) : null}
      {id === "S09" ? (
        <Character3D {...FITTER} position={[1.2, Y, 0.2]} yaw={-0.5} t={t} face={{ ...EXPRESSIONS.proud, look: -0.3 }}
          pose={{ armL: [150, 10], headNod: -12 }} hands={{ L: "point" }} faceCamera={cam.pos} faceCameraAmount={0.3} />
      ) : null}
      {id === "S13" && ledOn > 0 ? <Dust center={[0, 40, PYR_Z + 20]} size={[70, 80, 20]} t={t} count={60} color="#8fd23f" glow={1.2} /> : null}
    </>
  );
};

const LobbyScene: React.FC<SceneProps> = ({ t, id, cam }) => {
  const day = id === "S11";
  // S02: the dial counts 1 -> 105 between "one" and "floors" (60% in the first third)
  const k = clamp((t - at("one")) / (at("floors") - at("one")));
  const dial = id === "S02" ? 1 + 104 * (k < 1 / 3 ? 0.6 * k * 3 : 0.6 + 0.4 * eOut((k - 1 / 3) * 1.5)) : 1;
  const tear = id === "S11" ? clamp((t - at("months")) / 0.55) : 0;
  const banner = id === "S11" ? { text: "OPENING 2013", enter: eOut((t - at("hotel", 3)) / 0.25), drop: clamp((t - at("out", 2) + 0.12) / 0.4) } : null;
  const guestSpeaks = mouthOf(t, GUEST_WORDS, "smile");
  const clerkSpeaks = mouthOf(t, CLERK_WORDS, "flat");
  // acting cues
  const clerkFace: FaceState = id === "S11" ? (t > at("signs") ? EXPRESSIONS.happy : EXPRESSIONS.neutral) : { eyes: "half", brows: "neutral", mouth: "flat" };
  const signed = id === "S11" && t > at("signs");
  const ex = id === "S11" ? walkAlong(t, EXEC_OUT, { t0: at("later") - 0.1, speed: 1.15, height: EXEC.height }) : null;
  const guestFace: FaceState = id === "S12" ? (t > at("which") ? { ...EXPRESSIONS.scared, sweat: true } : EXPRESSIONS.neutral) : t > at("no") ? EXPRESSIONS.sad : t > at("so", 1) ? EXPRESSIONS.excited : EXPRESSIONS.happy;
  const gHead = headOf(GUEST_L, GUEST.height, GUEST.build);
  const cHead = headOf(CLERK_P, CLERK.height, CLERK.build);
  const hold = holdInFront({ position: EXEC_L, yaw: 1.1, height: EXEC.height, build: EXEC.build, side: "R", up: 0.45, forward: 0.22 });
  return (
    <Lobby t={t} day={day} dial={dial} calendar={id === "S11" ? (tear > 0.05 ? "2013" : "2012") : "2026"} tear={tear} banner={banner} sheets={!day}>
      <Character3D {...CLERK} position={CLERK_P} yaw={-0.35} t={t}
        face={{ ...clerkFace, mouth: clerkSpeaks ?? clerkFace.mouth }}
        pose={{ armR: id === "S02" && t > at("we") && t < at("so", 1) ? [95, 30] : [10, 15], armRFwd: 20, headTilt: t > at("no") && t < at("no") + 1 ? 4 : 0 }}
        hands={{ R: id === "S02" && t > at("we") && t < at("so", 1) ? "point" : "relaxed" }}
        faceCamera={cam.pos} faceCameraAmount={0.25} />
      {id !== "S11" ? (
        <>
          <Suitcase p={[-1.15, 0, -0.7]} yaw={0.5} />
          <Character3D {...GUEST} position={GUEST_L} yaw={1.05} t={t}
            face={{ ...guestFace, mouth: guestSpeaks ?? guestFace.mouth }}
            pose={{ armR: guestSpeaks !== guestFace.mouth || (t > at("so", 1) && t < at("no")) ? [60, 50] : [10, 14], armRFwd: 25, headTilt: id === "S12" && t > at("which") ? -6 : 0 }}
            hands={{ R: guestSpeaks !== guestFace.mouth ? "open" : "relaxed" }}
            faceCamera={cam.pos} faceCameraAmount={0.3} />
        </>
      ) : ex ? (
        <Character3D {...EXEC} position={ex.pos} yaw={ex.moving ? ex.yaw : 1.1} t={t}
          face={t > at("later") ? { ...EXPRESSIONS.neutral, look: -0.4 } : { ...EXPRESSIONS.happy, look: 0.3 }}
          pose={{ ...(ex.moving ? {} : hold.pose), walk: ex.moving ? ex.phase : undefined }} hold={signed && !ex.moving ? "letter" : ex.moving ? "letter" : "scroll"} holdSide="R"
          faceCamera={ex.moving ? undefined : cam.pos} faceCameraAmount={0.3} />
      ) : null}
      <CastLight at={id === "S11" ? headOf(EXEC_L, EXEC.height, EXEC.build) : gHead} cam={cam.pos} mood={moodOf(day ? "day" : "lamp")} />
      <CastLight at={cHead} cam={cam.pos} mood={moodOf(day ? "day" : "lamp")} />
    </Lobby>
  );
};

const TableScene: React.FC<SceneProps> = ({ t, id }) => (
  <Table t={t}
    unroll={id === "S04" ? eOut((t - at("so", 2) + 0.1) / 0.5) : 1}
    circle={id === "S04" ? clamp((t - at("build")) / 0.5) : 0}
    models={id === "S06"}
    grow={id === "S06" ? 0.55 + 0.45 * eOut((t - at("taller") + 0.12) / 0.34) : 0}
    gift={id === "S10" ? { glint: clamp((t - at("shiny")) / 0.45), lid: clamp((t - at("empty", 1)) / 0.33), moth: clamp((t - at("empty", 1) - 0.25) / 1.6) } : null} />
);

const SingaporeScene: React.FC<SceneProps> = ({ t, cam }) => {
  const cheer = t > at("opens") - 0.1;
  const jump = hop(t, at("tallest", 2) - 0.15, 0.5, 0.1);
  return (
    <Singapore t={t} bannerIn={eOut((t - at("singapore") - 0.1) / 0.3)}>
      <Character3D {...DOORMAN} position={[DOOR_P[0], DOOR_P[1] + jump.y, DOOR_P[2]]} yaw={-0.4} t={t} squash={jump.squash}
        face={cheer ? EXPRESSIONS.excited : EXPRESSIONS.happy}
        pose={{ armL: cheer ? [150, 20] : [12, 14], armR: cheer ? [150, 20] : [12, 14] }} hands={cheer ? { L: "open", R: "open" } : undefined}
        faceCamera={cam.pos} faceCameraAmount={0.35} />
      {cheer ? <Confetti center={[0.5, 3.0, -3]} size={[5, 3, 3]} t={t} t0={at("opens")} count={140} /> : null}
      <CastLight at={headOf(DOOR_P, DOORMAN.height, DOORMAN.build)} cam={cam.pos} mood={moodOf("golden")} />
    </Singapore>
  );
};

// ---------------------------------------------------------------- the video
export const Short: React.FC<{ sub?: boolean }> = ({ sub = false }) => {
  const ready = useFonts();
  const g = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const { n, fp } = sub ? subFrame(g) : { n: g, fp: g };
  const t = fp / FPS;
  const c = camAt(t);
  const camPrev = camAt(Math.max(0, t - 1 / FPS));
  const mood = moodOf(c.shot.mood);
  const set = c.shot.set;
  // motion blur only within a set (across a swap the previous lens belongs to another world)
  const prev = camPrev.shot.set === set ? camPrev.cam : undefined;
  const focus: V3 = set === "table" ? [0, TOP + 0.2, 0] : set === "lobby" ? [0.5, 1.4, -1.4] : set === "singapore" ? [DOOR_P[0], 1.5, DOOR_P[2]] : [0.3, 1.5, 0.5];
  const scene = { t, id: c.shot.id, cam: c.cam };
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <AbsoluteFill style={c.blur > 0.3 ? { filter: `blur(${c.blur.toFixed(1)}px)` } : undefined}>
        <View mood={mood} cam={c.cam} camPrev={prev} t={t} focus={focus} blur={set === "table" ? 2.4 : 1.2} look={LOOK} sky={set === "boulevard" || set === "singapore"}>
          {set === "boulevard" ? <BoulevardScene {...scene} /> : null}
          {set === "lobby" ? <LobbyScene {...scene} /> : null}
          {set === "table" ? <TableScene {...scene} /> : null}
          {set === "singapore" ? <SingaporeScene {...scene} /> : null}
        </View>
      </AbsoluteFill>
      <Captions chunks={CHUNKS} t={n / FPS} accent={ACC} accentColor="#8fd23f" until={END} />
      {!sub && HAS_VOICE ? <Audio src={staticFile("vo/voice.wav")} /> : null}
      {!sub ? <Audio src={staticFile("music/bed.wav")} volume={(f) => musicVol(f)} /> : null}
      {!sub ? BEDS.map((b, i) => {
        const dur = Math.max(2, Math.round((b.to - b.from) * FPS));
        return (
          <Sequence key={`bed${i}`} from={Math.round(b.from * FPS)} durationInFrames={dur} name={`amb ${b.file}`}>
            <Audio src={staticFile(`sfx/${b.file}.wav`)} loop volume={(x) => b.vol * Math.min(1, x / 4, (dur - x) / 4)} />
          </Sequence>
        );
      }) : null}
      {!sub ? CUES.map((q, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(q.at * FPS))} durationInFrames={q.dur ? Math.max(2, Math.round(q.dur * FPS)) : undefined} name={`sfx ${q.what}`}>
          <Audio src={staticFile(`sfx/${q.file}.wav`)} volume={q.vol} />
        </Sequence>
      )) : null}
    </AbsoluteFill>
  );
};

/** music bed ~14 dB under the voice (0.2), ducked a further 3 dB under speech, smoothed */
const SPEAK = WORDS.map((w) => [w[1] - 0.12, w[2] + 0.2] as [number, number]);
const MUSIC = (() => {
  const out: number[] = []; let v = 0.2;
  for (let f = 0; f < DURATION; f++) {
    const s = f / FPS;
    const target = SPEAK.some(([a, b]) => s >= a && s <= b) ? 0.14 : 0.2;
    v += (target - v) * 0.12; out.push(v);
  }
  return out;
})();
const musicVol = (f: number) => MUSIC[Math.min(MUSIC.length - 1, Math.max(0, f))];
void key; void Dust; void (null as unknown as CharacterSpec);
