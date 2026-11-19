import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FPS, W, wordAt, segOf, f, clamp, easeOut, easeInOut, mouthFor, blinkAt, rand, lerp } from '../lib';
import { Cam, camAt } from '../camera/Camera';
import { Character, Expr, Pose, View } from '../rig/Character';
import { GUEST, CLERK, EXEC, BUILDER, INSTALLER, DOORMAN, CITIZEN } from '../rig/outfits';
import { Suitcase, Clipboard, Blueprint, GlassPanel } from '../props/Props';
import { Pyramid, ACCENT } from '../props/Pyramid';
import { CityExterior } from '../sets/City';
import { Lobby, FLOOR_Y, DESK_X } from '../sets/Lobby';
import { MapInsert, Singapore, HeightChart, BlueprintTable, BannerWall, GiftBox, SEOUL, SINGAPORE } from '../sets/Inserts';
import { BlackCard, ChapterCard, TitleOverlay, Stamp, CounterPlate, Puff, Ring } from '../ui/Cards';

/* ------------------------------------------------------------------ beat timing (seconds) */
export type BeatDef = {
  id: string; start: number; end: number; words: string; shot: string; set: string;
  cast: string; prop: string; text: string; motion: string; effect: string;
  angle: string; camera: string; out: string; C: React.FC<ShotProps>;
};
export type ShotProps = { from: number; dur: number };

/** focus a world point at layer depth d → camera */
const focus = (px: number, py: number, d: number, z: number): Cam => ({ x: (px - W / 2) / d, y: (py - 540) / d, z });

/** two-key move with an explicit move window (shot-local frames): hold a, travel in [m0,m1] with ease, hold b */
const moveAt = (fr: number, a: Cam, b: Cam, m0: number, m1: number): Cam => {
  const k = easeInOut((fr - m0) / Math.max(1, m1 - m0));
  return { x: lerp(a.x, b.x, k) + Math.sin(fr / 37) * 2, y: lerp(a.y, b.y, k) + Math.cos(fr / 53) * 1.5, z: lerp(a.z, b.z, k) };
};

const useShot = (from: number) => {
  const fr = useCurrentFrame();
  const abs = from + fr;
  return { fr, abs, t: abs / FPS, lf: (sec: number) => f(sec) - from };
};

/* ------------------------------------------------------------------ cast helpers */
type CastSpec = { x: number; y: number; s?: number; view?: View; dir?: 1 | -1; expr?: Expr; pose?: Pose; spk?: string; seed: number; prop?: React.ReactNode; symbol?: 'sweat' | 'anger' | 'sparkle' | 'dizzy' | null; tilt?: number; shadow?: number };
const Cast: React.FC<{ c: CastSpec; abs: number; fr: number; outfit: typeof GUEST; idp: string }> = ({ c, abs, fr, outfit, idp }) => {
  const m = c.spk ? mouthFor(c.spk, abs) : null;
  return (
    <g transform={`translate(${c.x},${c.y}) scale(${c.s ?? 1})`}>
      <Character outfit={outfit} idPrefix={idp} view={c.view} dir={c.dir} expr={c.expr} pose={c.pose ?? (m ? 'talk' : 'idle')} mouth={m}
        blink={blinkAt(fr, c.seed)} t={abs / FPS + c.seed} prop={c.prop} symbol={c.symbol ?? null} headTilt={m ? Math.sin(abs / 9) * 6 : (c.tilt ?? 0)} shadow={c.shadow ?? 0.4} />
    </g>
  );
};
const RollingSuitcase: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <ellipse cx={10} cy={2} rx={70} ry={10} fill="#000" opacity={0.35} />
    <line x1={40} y1={-90} x2={60} y2={-200} stroke="#111" strokeWidth={6} />
    <g transform="translate(0,-48)"><Suitcase /></g>
    <circle cx={-40} cy={-6} r={8} fill="#222" /><circle cx={40} cy={-6} r={8} fill="#222" />
  </g>
);

/* ================================================================== BEATS */

// B01 – frame 0: the Guest with the lit pyramid, already moving
const B01: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t } = useShot(from);
  const walk = clamp(fr / 15);
  const gx = lerp(560, 760, easeOut(walk));
  const cam = camAt(fr, dur, focus(960, 470, 1, 1.0), focus(960, 430, 1, 1.12), 'creep');
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="night" idp="b01" pyramid="lit" ledOn={1} mist={0.6} foreground="lamp"
        cast={<g>
          <RollingSuitcase x={gx - 150} y={1000} s={1.1} />
          <Cast c={{ x: gx, y: 1010, s: 1.15, view: 'back', pose: fr < 15 ? 'walk' : 'idle', seed: 1 }} abs={abs} fr={fr} outfit={GUEST} idp="b01g" />
        </g>} />
      <Stamp text="PYONGYANG" from={5} />
    </AbsoluteFill>
  );
};

// B02 – black card
const B02: React.FC<ShotProps> = ({ from }) => {
  const s = segOf('n02');
  return <BlackCard text="It has never had a single guest." typeFrom={f(s.start) - from} typeTo={f(s.end) - from - 4} />;
};

// B03 – elevator dial counts to 105, pan to the key rack: every key still on its hook
const B03: React.FC<ShotProps> = ({ from }) => {
  const { fr, t, lf } = useShot(from);
  const c0 = lf(wordAt('n03', 'one')), c1 = lf(wordAt('n03', 'floors'));
  const k = clamp((fr - c0) / Math.max(1, c1 - c0));
  const dial = 1 + 104 * (k < 1 / 3 ? 0.6 * k * 3 : 0.6 + 0.4 * easeOut((k - 1 / 3) * 1.5));
  const zero = lf(wordAt('n03', 'zero'));
  const cam = moveAt(fr, focus(1715, 200, 0.6, 1.9), focus(1320, 360, 0.6, 1.55), zero - 16, zero);
  return (
    <AbsoluteFill>
      <Lobby cam={cam} t={t} mode="night" idp="b03" dialFloor={dial} calendar="2026" dust={0.5}
        overlay={<Ring x={960} y={540} r={120} at={c1} frame={fr} color="#F6C76A" />} />
    </AbsoluteFill>
  );
};

// B04 – skit 1 establishing: the Guest arrives at reception
const B04: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t } = useShot(from);
  const cam = camAt(fr, dur, focus(1000, 470, 1, 1.12), focus(1004, 470, 1, 1.12), 'still');
  return (
    <AbsoluteFill>
      <Lobby cam={cam} t={t} mode="night" idp="b04" calendar="2026" dust={0.4}
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: '3q', dir: -1, expr: 'deadpan', seed: 2, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b04c" />}
        cast={<g>
          <RollingSuitcase x={560} y={790} />
          <Cast c={{ x: 720, y: 780, view: '3q', dir: 1, expr: 'happy', spk: 'guest', seed: 1 }} abs={abs} fr={fr} outfit={GUEST} idp="b04g" />
        </g>} />
    </AbsoluteFill>
  );
};

// B05 – OTS behind the Guest: the Clerk points at 105 floors' worth of keys
const B05: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(1240, 420, 0.95, 1.5);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, x: cam.x + Math.sin(fr / 37) * 2 }} t={t} mode="night" idp="b05" calendar="2026"
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: 'front', expr: 'deadpan', spk: 'clerk', pose: 'point', seed: 2, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b05c" />}
        overlay={<g transform="translate(330,1260) scale(2.1)"><Character outfit={GUEST} idPrefix="b05g" view="back" t={t} shadow={0} /></g>} />
    </AbsoluteFill>
  );
};

// B06 – earned close-up: the Guest's hopeful "So... yes?"
const B06: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(720, 452, 1, 3.9);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, y: cam.y + Math.cos(fr / 40) * 1.5 }} t={t} mode="night" idp="b06" calendar="2026"
        cast={<Cast c={{ x: 720, y: 780, view: '3q', dir: 1, expr: 'happy', spk: 'guest', seed: 1, symbol: fr > 10 ? 'sparkle' : null }} abs={abs} fr={fr} outfit={GUEST} idp="b06g" />} />
    </AbsoluteFill>
  );
};

// B07 – earned close-up: "No." then hold the deadpan
const B07: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(DESK_X, 380, 0.95, 4.2);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, x: cam.x + Math.sin(fr / 41) * 1.5 }} t={t} mode="night" idp="b07" calendar="2026"
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: 'front', expr: 'deadpan', spk: 'clerk', seed: 2, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b07c" />} />
    </AbsoluteFill>
  );
};

// B08 – the twist: every night it lights up (glow switch-on build)
const B08: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t, lf } = useShot(from);
  const on = lf(wordAt('n04', 'lights'));
  const ledOn = easeOut((fr - on) / 12);
  const cam = camAt(fr, dur, focus(960, 420, 1, 1.0), focus(960, 400, 1, 1.05), 'punch', on, 0.1);
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="night" idp="b08" pyramid="lit" ledOn={ledOn} mist={0.5} foreground="railing"
        cast={<Cast c={{ x: 1340, y: 960, s: 1.05, view: 'back', expr: 'surprised', seed: 4 }} abs={abs} fr={fr} outfit={CITIZEN} idp="b08c" />}
        overlay={<Ring x={960} y={300} r={260} at={on} frame={fr} color={ACCENT} />} />
    </AbsoluteFill>
  );
};

// B09 – black card
const B09: React.FC<ShotProps> = ({ from }) => {
  const s = segOf('n05');
  return <BlackCard text="A light show. Zero guests." typeFrom={f(s.start) - from} typeTo={f(s.end) - from - 4} />;
};

// B10 – top-down blueprint: why build it?
const B10: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, t, lf } = useShot(from);
  const u0 = lf(wordAt('n06', 'so'));
  const unroll = easeOut((fr - u0) / 14);
  const c0 = lf(wordAt('n06', 'build'));
  const cam = camAt(fr, dur, focus(960, 540, 1, 1.0), focus(960, 520, 1, 1.12), 'creep');
  return <AbsoluteFill><BlueprintTable cam={cam} t={t} unroll={unroll} circle={clamp((fr - c0) / 14)} /></AbsoluteFill>;
};

// B11 – why can't they finish it? The Guest waits alone in the empty lobby (pull-out)
const B11: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t } = useShot(from);
  const cam = camAt(fr, dur, focus(820, 470, 1, 1.35), focus(960, 450, 1, 1.05), 'settle');
  return (
    <AbsoluteFill>
      <Lobby cam={cam} t={t} mode="night" idp="b11" calendar="2026" dust={1}
        cast={<g>
          <RollingSuitcase x={600} y={790} />
          <Cast c={{ x: 760, y: 780, view: 'front', expr: 'thinking', seed: 1 }} abs={abs} fr={fr} outfit={GUEST} idp="b11g" />
        </g>} />
    </AbsoluteFill>
  );
};

// B12 – title over the live glowing scene
const B12: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, t } = useShot(from);
  const cam = camAt(fr, dur, focus(960, 470, 1, 0.98), focus(960, 460, 1, 1.04), 'creep');
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="night" idp="b12" pyramid="lit" mist={0.6} foreground="none" />
      <AbsoluteFill style={{ background: 'rgba(0,0,0,0.25)' }} />
      <TitleOverlay lines={[{ text: 'THE HOTEL THAT' }, { text: 'HAS NEVER HAD' }, { text: 'A SINGLE GUEST', accent: true }]} />
    </AbsoluteFill>
  );
};

const B13: React.FC<ShotProps> = () => <ChapterCard text="The Race to the Sky" />;

// B14 – Singapore 1986: tilt up the world's tallest hotel
const B14: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t, lf } = useShot(from);
  const land = lf(wordAt('n07', 'tallest'));
  const bannerDrop = clamp((fr - 4) / 7);
  const cam = moveAt(fr, focus(960, 520, 1, 1.0), focus(960, -330, 0.7, 0.72), land - 20, land);
  return (
    <AbsoluteFill>
      <Singapore cam={cam} t={t} bannerDrop={bannerDrop}
        cast={<Cast c={{ x: 1180, y: 780, view: 'front', expr: 'happy', pose: fr > 8 ? 'cheer' : 'idle', seed: 5 }} abs={abs} fr={fr} outfit={DOORMAN} idp="b14d" />} />
      <Stamp text="SINGAPORE 1986" from={3} />
    </AbsoluteFill>
  );
};

// B15 – map: a South Korean company built it (route Seoul → Singapore)
const B15: React.FC<ShotProps> = ({ from }) => {
  const { fr, t, lf } = useShot(from);
  const r0 = lf(wordAt('n07', 'south')), r1 = lf(wordAt('n07', 'built'));
  const route = easeInOut((fr - r0) / Math.max(1, r1 - r0));
  const a = focus(SEOUL[0] - 120, SEOUL[1] + 120, 1, 1.25), b = focus((SEOUL[0] + SINGAPORE[0]) / 2 - 80, (SEOUL[1] + SINGAPORE[1]) / 2 + 40, 1, 0.98);
  const cam = moveAt(fr, a, b, r0, r1);
  return <AbsoluteFill><MapInsert cam={cam} t={t} seoulPin={clamp((fr - 2) / 7)} route={route} sgPin={clamp((fr - r1) / 7)} labels={clamp((fr - 6) / 8)} /></AbsoluteFill>;
};

// B16 – height chart: North Korea wants a taller one (grow from the ground)
const B16: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, t, lf } = useShot(from);
  const g0 = lf(wordAt('n08', 'taller'));
  const cam = camAt(fr, dur, focus(960, 520, 1, 0.98), focus(1000, 480, 1, 1.1), 'creep');
  return <AbsoluteFill><HeightChart cam={cam} t={t} grow={easeOut((fr - g0 + 4) / 10)} tagIn={clamp((fr - g0 - 8) / 7)} /></AbsoluteFill>;
};

// B17 – 1987: work starts. Floors stack up, the camera cranes up with the stack (sepia flashback)
const B17: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t, lf } = useShot(from);
  const w0 = lf(wordAt('n08', 'work'));
  // floors land with gaps 10,5,3,3,3,2...
  const gaps = [0, 10, 15, 18, 21, 24, 26, 28, 30, 32];
  const landed = gaps.filter((g) => fr - w0 >= g).length;
  const rise = 0.08 + landed * 0.06;
  const lastLand = w0 + gaps[Math.max(0, landed - 1)];
  const cam = moveAt(fr, focus(960, 560, 1, 1.0), focus(960, 380, 1, 1.02), w0, w0 + 34);
  return (
    <AbsoluteFill style={{ filter: 'sepia(0.85) saturate(0.85) brightness(0.92)' }}>
      <CityExterior cam={cam} t={t} grade="sepia" idp="b17" pyramid="concrete" crane pyrRise={rise} foreground="fence"
        cast={<Cast c={{ x: 520, y: 930, s: 0.95, view: '3q', dir: 1, expr: 'happy', pose: 'hold', prop: <Blueprint />, seed: 6 }} abs={abs} fr={fr} outfit={BUILDER} idp="b17b" />}
        inWorld={landed > 0 ? <Puff x={960} y={660 - 1050 * 0.62 * rise * 1.05 + 20} at={lastLand} frame={fr} s={1.3} /> : null} />
      <Stamp text="1987" side="right" from={3} />
    </AbsoluteFill>
  );
};

const B18: React.FC<ShotProps> = ({ from }) => {
  const s = segOf('n09');
  return <BlackCard text="Then, in 1992, the money runs out." typeFrom={f(s.start) - from} typeTo={f(s.end) - from - 6} />;
};

// B19 – Its Soviet ally has collapsed: the banner drops (drop + puff)
const B19: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, t, lf } = useShot(from);
  const c0 = lf(wordAt('n10', 'collapsed')) - 6;
  const fall = clamp((fr - c0) / 10);
  const cam = camAt(fr, dur, focus(960, 520, 1, 1.0), focus(960, 520, 1, 1.0), 'still');
  return (
    <AbsoluteFill style={{ filter: 'sepia(0.6) saturate(0.9)' }}>
      <BannerWall cam={cam} t={t} fall={fall} frame={fr} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}><Puff x={960} y={900} at={c0 + 10} frame={fr} s={2.2} /></svg>
    </AbsoluteFill>
  );
};

// B20 – sixteen years: the bare concrete pyramid in the wind, years roll 1992 → 2008
const B20: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t, lf } = useShot(from);
  const y0 = lf(wordAt('n10', 'sixteen'));
  const cam = camAt(fr, dur, focus(960, 470, 1, 1.0), focus(960, 440, 1, 1.14), 'creep');
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="overcast" idp="b20" pyramid="concrete" crane foreground="railing" debris={1}
        cast={<Cast c={{ x: 1420, y: 940, s: 0.95, view: '3q', dir: -1, expr: 'sad', seed: 7 }} abs={abs} fr={fr} outfit={CITIZEN} idp="b20c" />} />
      <CounterPlate from={1992} to={2008} start={y0} dur={30} label="YEAR" format={(n) => String(Math.round(n))} />
    </AbsoluteFill>
  );
};

// B21 – 2011: glass panels slide on row by row (side-slide stack), camera tilts up with them
const B21: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t, lf } = useShot(from);
  const g0 = lf(wordAt('n11', 'egyptian')), g1 = lf(wordAt('n11', 'glass'));
  const steps = 10;
  // accelerate: early rows slower, later rows faster
  const p = clamp((fr - g0) / Math.max(1, g1 - g0));
  const rows = Math.floor(Math.pow(p, 0.7) * steps);
  const rise = rows / steps;
  const cam = moveAt(fr, focus(960, 560, 1, 1.0), focus(960, 440, 1, 1.0), g0, g1);
  const pyrScale = 0.62, pyrY = 660, ph = 1050 * pyrScale;
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="day" idp="b21" pyramid="concrete" crane={rows < steps} foreground="none"
        inWorld={<g>
          <defs><clipPath id="b21-glass"><rect x={-2000} y={pyrY - ph * 1.05 * rise} width={6000} height={ph * 1.05 * rise + 10} /></clipPath></defs>
          <g clipPath="url(#b21-glass)"><g transform={`translate(${W / 2},${pyrY}) scale(${pyrScale})`}><Pyramid state="glass" crane={false} idPrefix="b21g" /></g></g>
          {rows > 0 && rows < steps && <rect x={W / 2 - 200} y={pyrY - ph * 1.05 * rise - 4} width={400} height={8} fill="#EAF3F5" opacity={0.8} />}
        </g>}
        cast={<Cast c={{ x: 1380, y: 960, s: 0.95, view: '3q', dir: -1, expr: 'happy', pose: 'hold', prop: <GlassPanel />, seed: 8 }} abs={abs} fr={fr} outfit={INSTALLER} idp="b21i" />} />
      <Stamp text="2011" from={3} />
    </AbsoluteFill>
  );
};

// B22 – literal metaphor: wrapped present, shiny paper, empty box
const B22: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, t, lf } = useShot(from);
  const gl = lf(wordAt('n11', 'shiny')), lidAt = lf(wordAt('n11', 'empty'));
  const cam = camAt(fr, dur, focus(960, 520, 1, 0.96), focus(960, 470, 1, 1.08), 'punch', lidAt, 0.1);
  return <AbsoluteFill><GiftBox cam={cam} t={t} glint={clamp((fr - gl) / 14)} lid={clamp((fr - lidAt) / 10)} moth={clamp((fr - lidAt - 8) / 50)} /></AbsoluteFill>;
};

// B23 – 2012: a hotel chain signs on (day lobby; banner slides in; the Clerk smiles for once)
const B23: React.FC<ShotProps> = ({ from, dur }) => {
  const { fr, abs, t, lf } = useShot(from);
  const signs = lf(wordAt('n12', 'signs'));
  const enter = easeOut((fr - lf(wordAt('n12', 'hotel'))) / 6);
  const cam = camAt(fr, dur, focus(1000, 470, 1, 1.12), focus(1000, 460, 1, 1.2), 'creep');
  return (
    <AbsoluteFill>
      <Lobby cam={cam} t={t} mode="day2012" idp="b23" calendar="2012" sheets={false}
        banner={{ text: 'OPENING 2013', drop: 0, enter }}
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: '3q', dir: -1, expr: fr >= signs ? 'happy' : 'neutral', seed: 2, shadow: 0, symbol: fr >= signs ? 'sparkle' : null }} abs={abs} fr={fr} outfit={CLERK} idp="b23c" />}
        cast={<Cast c={{ x: 740, y: 780, view: '3q', dir: 1, expr: 'happy', pose: 'hold', prop: <Clipboard label={fr >= signs ? 'SIGNED' : 'CONTRACT'} />, seed: 9 }} abs={abs} fr={fr} outfit={EXEC} idp="b23e" />} />
      <Stamp text="2012" side="right" from={3} />
    </AbsoluteFill>
  );
};

// B24 – months later, it pulls out: calendar page rips, the Exec walks out, the banner falls
const B24: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t, lf } = useShot(from);
  const tear = clamp((fr - lf(wordAt('n12', 'months'))) / 16);
  const w0 = lf(wordAt('n12', 'later')), out = lf(wordAt('n12', 'out'));
  const ex = lerp(740, -260, clamp((fr - w0) / (out - w0 + 4)));
  const cam = focus(1000, 470, 1, 1.12);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, x: cam.x - fr * 0.5 }} t={t} mode="day2012" idp="b24" calendar={tear > 0.02 ? '2013' : '2012'} calendarTear={tear} sheets={false}
        banner={{ text: 'OPENING 2013', drop: clamp((fr - out + 4) / 10) }}
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: '3q', dir: -1, expr: fr > out ? 'concerned' : 'neutral', seed: 2, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b24c" />}
        cast={<Cast c={{ x: ex, y: 780, view: fr >= w0 ? 'side' : '3q', dir: fr >= w0 ? -1 : 1, expr: 'deadpan', pose: fr >= w0 ? 'walk' : 'hold', prop: <Clipboard label="SIGNED" />, seed: 9 }} abs={abs} fr={fr} outfit={EXEC} idp="b24e" />} />
    </AbsoluteFill>
  );
};

// B25 – skit 2, OTS behind the Clerk: "Opening date?"
const B25: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(740, 470, 1, 1.55);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, x: cam.x + Math.sin(fr / 37) * 2 }} t={t} mode="night" idp="b25" calendar="2026" dust={0.5}
        cast={<g><RollingSuitcase x={580} y={790} /><Cast c={{ x: 740, y: 780, view: '3q', dir: 1, expr: 'neutral', spk: 'guest', seed: 1 }} abs={abs} fr={fr} outfit={GUEST} idp="b25g" /></g>}
        overlay={<g transform="translate(1640,1280) scale(2.1)"><Character outfit={CLERK} idPrefix="b25c" view="back" t={t} shadow={0} /></g>} />
    </AbsoluteFill>
  );
};

// B26 – "Soon." Clerk medium shot
const B26: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(DESK_X, 420, 0.95, 1.8);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, y: cam.y + Math.cos(fr / 41) * 1.5 }} t={t} mode="night" idp="b26" calendar="2026"
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: 'front', expr: 'deadpan', spk: 'clerk', seed: 2, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b26c" />} />
    </AbsoluteFill>
  );
};

// B27 – "Which year?" Guest close-up, concerned
const B27: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(740, 452, 1, 3.9);
  return (
    <AbsoluteFill>
      <Lobby cam={cam} t={t} mode="night" idp="b27" calendar="2026"
        cast={<Cast c={{ x: 740, y: 780, view: '3q', dir: 1, expr: 'concerned', spk: 'guest', seed: 1, symbol: 'sweat' }} abs={abs} fr={fr} outfit={GUEST} idp="b27g" />} />
    </AbsoluteFill>
  );
};

// B28 – "...Soon." the callback close-up, hold the deadpan
const B28: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t } = useShot(from);
  const cam = focus(DESK_X, 380, 0.95, 4.2);
  return (
    <AbsoluteFill>
      <Lobby cam={{ ...cam, x: cam.x + Math.sin(fr / 41) * 1.5 }} t={t} mode="night" idp="b28" calendar="2026"
        clerk={<Cast c={{ x: DESK_X, y: FLOOR_Y, view: 'front', expr: 'deadpan', spk: 'clerk', seed: 3, shadow: 0 }} abs={abs} fr={fr} outfit={CLERK} idp="b28c" />} />
    </AbsoluteFill>
  );
};

// B29 – back to the opening image: lights switch on, the camera tilts up to the glowing flag
const B29: React.FC<ShotProps> = ({ from }) => {
  const { fr, abs, t, lf } = useShot(from);
  const c0 = lf(wordAt('n13', 'hundred')), sw = lf(wordAt('n13', 'switch')), flag = lf(wordAt('n13', 'flag'));
  const ledOn = easeOut((fr - sw) / 14);
  const cam = moveAt(fr, focus(960, 470, 1, 1.0), focus(960, 70, 0.55, 1.3), sw + 6, flag);
  return (
    <AbsoluteFill>
      <CityExterior cam={cam} t={t} grade="night" idp="b29" pyramid="lit" ledOn={ledOn} mist={0.6} foreground="lamp"
        inWorld={ledOn > 0 ? <g>{Array.from({ length: 14 }).map((_, i) => {
          const u = (rand(i) + t * 0.05) % 1;
          return <circle key={i} cx={W / 2 + (rand(i + 4) - 0.5) * 380} cy={620 - u * 560} r={3 + rand(i + 2) * 3} fill={ACCENT} opacity={ledOn * 0.6 * Math.sin(u * Math.PI)} />;
        })}</g> : null}
        cast={<g>
          <RollingSuitcase x={610} y={1000} s={1.1} />
          <Cast c={{ x: 760, y: 1010, s: 1.15, view: 'back', seed: 1 }} abs={abs} fr={fr} outfit={GUEST} idp="b29g" />
        </g>}
        overlay={<Ring x={960} y={540} r={200} at={sw} frame={fr} color={ACCENT} />} />
      <CounterPlate from={0} to={100000} start={c0} dur={34} label="LIGHTS" />
    </AbsoluteFill>
  );
};

const B30: React.FC<ShotProps> = ({ from }) => {
  const s = segOf('n14');
  return <BlackCard text="And every room is still empty." typeFrom={f(s.start) - from} typeTo={f(s.end) - from - 6} />;
};

/* ------------------------------------------------------------------ beat table */
const b = (id: string, start: number, end: number, C: React.FC<ShotProps>, words: string, shot: string, set: string, cast: string, prop: string, text: string, motion: string, effect: string, angle: string, camera: string, out = 'hard cut'): BeatDef =>
  ({ id, start, end, C, words, shot, set, cast, prop, text, motion, effect, angle, camera, out });

export const BEATS: BeatDef[] = [
  b('B01', 0.00, 2.45, B01, 'This is the tallest hotel in North Korea.', 'Story scene (opening image)', 'Pyongyang street, night', 'Guest, back view, walking in then idle, rolling suitcase', 'Hero pyramid, LEDs on, halo', 'Stamp: PYONGYANG', 'Guest walks in (0.5 s) and stops', 'Ground mist (quiet) - night atmosphere', 'Back view reveal', 'Push-in creep 1.00 to 1.12 on the pyramid'),
  b('B02', 2.45, 4.60, B02, 'It has never had a single guest.', 'Black text card', '-', '-', '-', 'Card types on with the voice', 'Typing', 'none', '-', 'Locked'),
  b('B03', 4.60, 7.45, B03, 'One hundred and five floors. Zero check-ins.', 'Insert (staged build: counter)', 'Lobby, night (abandoned)', '-', 'Elevator dial counts 1 to 105; key rack with all 105 keys hanging', 'In-world: dial, ROOM KEYS sign, OUT OF ORDER', 'Counter on "one...floors"; ring on landing', 'Dust in window beam - abandoned stillness', 'Object hero shot', 'Hold on dial, travel pan to the key rack landing on "Zero"'),
  b('B04', 7.45, 9.00, B04, '- Do you have a room?', 'Skit scene (establishing)', 'Lobby, night', 'Guest 3/4 right, happy, talking; Clerk behind desk 3/4 left, deadpan', 'Suitcase, desk, bell', 'In-world: RECEPTION', 'Guest gestures once', 'Dust in beam (quiet)', 'Establishing high-wide', 'Locked, barely visible drift'),
  b('B05', 9.00, 11.55, B05, '- We have a hundred and five floors.', 'Skit scene', 'Lobby, night', 'Guest back view (near, OTS); Clerk front, deadpan, talking + pointing', 'Key rack behind Clerk', '-', 'Clerk points once', 'none', 'Over-the-shoulder', 'Locked, drift'),
  b('B06', 11.55, 12.85, B06, '- So... yes?', 'Skit close-up (earned: the hope)', 'Lobby, night', 'Guest 3/4, happy, sparkle mark', '-', '-', 'Head tilt while talking', 'none', 'Close-up', 'Locked, drift'),
  b('B07', 12.85, 14.80, B07, '- No. (+ "But here\'s" starts over the hold)', 'Skit close-up (earned: punchline)', 'Lobby, night', 'Clerk front, deadpan, blinks', '-', '-', 'Says "No." then holds 1.1 s', 'none', 'Close-up', 'Locked, drift'),
  b('B08', 14.80, 17.20, B08, 'But here\'s the strange part. Every night, it lights up.', 'Story scene (staged build: glow switch-on)', 'Pyongyang street, night (railing fg)', 'Passer-by, back view, surprised', 'Pyramid LEDs sweep on bottom-to-top; accent ring', '-', 'Switch-on on "lights"', 'Mist (quiet); LED glow - power', 'Back view reveal', 'Creep, then punch +10% on "lights"'),
  b('B09', 17.20, 19.25, B09, 'A light show. Zero guests.', 'Black text card', '-', '-', '-', 'Card', 'Typing', 'none', '-', 'Locked'),
  b('B10', 19.25, 20.45, B10, 'So why build it?', 'Table-top insert (scan reveal)', 'Top-down drafting table', '-', 'Blueprint unrolls; red pencil circles the empty inside', 'In-world: 105 FLOORS, PYONGYANG - 1987', 'Unroll on "So", circle on "build"', 'none', 'Top-down', 'Push-in creep'),
  b('B11', 20.45, 22.10, B11, 'And why can\'t they finish it?', 'Story scene', 'Lobby, night, dust sheets', 'Guest front, thinking, alone', 'Suitcase', '-', 'Idle, blink', 'Dust in beam (main) - stillness', 'Establishing high-wide', 'Pull-out (settle)'),
  b('B12', 22.10, 23.62, B12, '[TITLE] (silence)', 'Title card over live scene', 'Pyongyang street, night', '-', 'Lit pyramid with halo', 'THE HOTEL THAT / HAS NEVER HAD / A SINGLE GUEST (accent)', 'Lines arrive 0.3 s apart', 'Mist (quiet)', 'Establishing high-wide', 'Push-in creep'),
  b('B13', 23.62, 25.70, B13, '[CHAPTER] (silence)', 'Chapter card', '-', '-', '-', 'The Race to the Sky', 'none', 'none', '-', 'Locked'),
  b('B14', 25.70, 28.15, B14, 'Singapore opens the world\'s tallest hotel.', 'Story scene (establishing)', 'Singapore 1986, sunset (triumph grade)', 'Doorman, front, happy, cheering', 'Cylindrical tower, TALLEST HOTEL 1986 banner drops in', 'Stamp: SINGAPORE 1986', 'Banner drops (7 f), doorman cheers', 'Palm sway (quiet)', 'Establishing, then hero low angle', 'Hold, then tilt up the tower landing on "tallest"'),
  b('B15', 28.15, 30.30, B15, 'A South Korean company built it.', 'Map', 'Light map: Korea to Singapore', '-', 'South Korea in blue, pin drops in Seoul, white arc draws to Singapore, second pin', 'Map labels: SOUTH KOREA, SINGAPORE', 'Route draws "South...built" (~1 s)', 'none', 'Top-down', 'Travel pan + slight pull-out following the arc'),
  b('B16', 30.30, 32.75, B16, 'North Korea reportedly wants a taller one.', 'Literal metaphor (grow from the ground)', 'Height-chart wall insert', '-', 'Singapore drum model vs pyramid model growing taller', 'In-world tags: SINGAPORE, PYONGYANG', 'Pyramid grows on "taller" (10 f), tag drops', 'none', 'Object hero shot', 'Push-in creep'),
  b('B17', 32.75, 35.20, B17, 'Work starts in nineteen eighty-seven.', 'Story scene (staged build: stack)', 'Construction site, sepia flashback', 'Builder 3/4, happy, holding blueprint', 'Pyramid floors land one by one (gaps 10,5,3,3,3,2...), crane, dust puffs', 'Stamp: 1987', 'Stack build from "Work"', 'Dust puffs on each landing', 'Establishing high-wide', 'Crane up with the growing stack'),
  b('B18', 35.20, 38.70, B18, 'Then, in nineteen ninety-two, the money runs out.', 'Black text card', '-', '-', '-', 'Card (digits: 1992)', 'Typing', 'none', '-', 'Locked'),
  b('B19', 38.70, 40.55, B19, 'Its Soviet ally has collapsed.', 'Insert set (drop and puff)', 'Brick wall, sepia', '-', 'USSR banner snaps off its nails and falls; empty AID crate', 'In-world: USSR, AID', 'Fall on "collapsed", dust puff', 'none', 'Object hero shot', 'Still'),
  b('B20', 40.55, 43.65, B20, 'For sixteen years, it\'s a bare concrete pyramid.', 'Story scene (counter)', 'Pyongyang, overcast', 'Passer-by 3/4, sad', 'Bare concrete pyramid, frozen crane', 'Corner plate: YEAR 1992 to 2008', 'Counter on "sixteen"', 'Wind + blowing debris (main) - loss', 'Establishing high-wide', 'Push-in creep 1.00 to 1.14'),
  b('B21', 43.65, 47.50, B21, 'By twenty eleven, an Egyptian firm wraps it in glass.', 'Story scene (side-slide stack)', 'Pyongyang, day', 'Glass fitter 3/4, happy, holding a panel', 'Glass skin climbs the pyramid row by row; crane disappears at the top', 'Stamp: 2011', 'Rows accelerate "Egyptian...glass"', 'Moving clouds (quiet) - daytime', 'Establishing, then low angle', 'Tilt up with the rising glass, landing on "glass"'),
  b('B22', 47.50, 51.85, B22, 'It\'s a wrapped present. Shiny paper. Empty box.', 'Literal metaphor (hold, 3 events)', 'Striped-wall insert', '-', 'Giant gift box in glass-blue paper; glint sweep; lid lifts; one moth flies out', 'In-world: 105 FL. tag; pinned note GUESTS: 0', 'Glint on "Shiny", lid on "Empty", puff', 'none', 'Object hero shot', 'Creep, then punch on "Empty"'),
  b('B23', 51.85, 54.30, B23, 'In twenty twelve, a hotel chain signs on.', 'Story scene', 'Lobby, day 2012 (lit, no dust sheets)', 'Hotel Exec 3/4 holding contract; Clerk happy (sparkle)', 'Contract flips to SIGNED; OPENING 2013 banner slides in', 'Stamp: 2012', 'Banner in on "hotel", sign on "signs"', 'none', 'Establishing high-wide', 'Push-in creep'),
  b('B24', 54.30, 56.10, B24, 'Months later, it pulls out.', 'Story scene', 'Lobby, day 2012', 'Exec walks out left (side view); Clerk concerned', 'Calendar page rips (2012 to 2013); banner falls', 'In-world: calendar', 'Tear on "Months", walk on "later", fall on "out"', 'none', 'Establishing high-wide', 'Slow drift pan left following the exit'),
  b('B25', 56.10, 57.45, B25, '- Opening date?', 'Skit scene', 'Lobby, night 2026', 'Clerk back view (near, OTS); Guest 3/4 talking', 'Suitcase', '-', 'Guest gestures', 'Dust in beam (quiet)', 'Over-the-shoulder', 'Locked, drift'),
  b('B26', 57.45, 58.65, B26, '- Soon.', 'Skit scene', 'Lobby, night', 'Clerk front, deadpan, talking', '-', '-', 'Head tilt', 'none', 'Medium', 'Locked, drift'),
  b('B27', 58.65, 59.80, B27, '- Which year?', 'Skit close-up (earned)', 'Lobby, night', 'Guest 3/4, concerned, sweat drop', '-', '-', 'Talk', 'none', 'Close-up', 'Locked'),
  b('B28', 59.80, 61.40, B28, '- ...Soon.', 'Skit close-up (callback of B07)', 'Lobby, night', 'Clerk front, deadpan; holds after the line', '-', '-', 'Says "Soon." then holds', 'none', 'Close-up', 'Locked, drift'),
  b('B29', 61.40, 66.44, B29, 'Tonight, over a hundred thousand lights switch on. A giant flag glows at the top.', 'Story scene (opening image returns; hold, 3 events)', 'Pyongyang street, night', 'Guest back view with suitcase', 'LEDs switch on, accent particles rise, flag glows on the crown', 'Corner plate: LIGHTS 0 to 100,000', 'Counter on "hundred", switch-on on "switch"', 'Mist (quiet) + accent particles around the hero', 'Back view reveal, then object hero shot', 'Hold, then tilt up 1.0 to 1.3 landing on "flag"'),
  b('B30', 66.44, 68.571, B30, 'And every room is still empty.', 'Black text card (final)', '-', '-', '-', 'Card', 'Typing', 'none', '-', 'Locked', 'end'),
];
void Pyramid;
