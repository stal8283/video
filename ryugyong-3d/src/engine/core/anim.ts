// Animation helpers: the cartoon physics that makes motion feel alive. Every function is a PURE function of time
// (no state, no Math.random), so any frame renders the same in any render tab.
//
//   key(t, [[t0, v0], [t1, v1], ...], ease)   piecewise animation between keys
//   anticipate(t, t0, dur, back)               a small move AGAINST the action, then the action (0 → 1)
//   overshoot(t, t0, dur, amount)              goes past the target and settles (0 → 1)
//   settle(t, t0, freq, damp)                  a damped wobble after an impact (1 → 0, oscillating)
//   hop(t, t0, dur, height)                    a jump: {y, squash} with take-off stretch and landing squash
//   secondary(f, t, opts)                      a spring that FOLLOWS a signal (hair, a tail, a held bag, antenna)
//   walkAlong(t, path, opts)                   walk a polyline at a speed: position, yaw, the walk phase that
//                                              matches the step length (no foot sliding), and `moving`
//   EXPRESSIONS                                named faces: happy, laugh, sad, angry, surprised, scared, thinking…
import type { V3 } from "../types";
import type { FaceState } from "../char/Character3D";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export type Ease = (u: number) => number;
export const EASE = {
  linear: (u: number) => u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u: number) => 1 - Math.pow(1 - u, 3),
  in: (u: number) => u * u * u,
  /** ease out with a small overshoot (back) */
  back: (u: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
  /** springy settle */
  elastic: (u: number) => (u === 0 || u === 1 ? u : Math.pow(2, -10 * u) * Math.sin((u * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
} satisfies Record<string, Ease>;

/** piecewise keys: [[time, value], ...] sorted by time; eased per segment */
export const key = (t: number, keys: [number, number][], ease: Ease = EASE.inOut): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * ease(clamp((t - t0) / Math.max(1e-6, t1 - t0)));
  }
  return keys[keys.length - 1][1];
};
/** the same for vectors */
export const keyV = (t: number, keys: [number, V3][], ease: Ease = EASE.inOut): V3 =>
  [0, 1, 2].map((i) => key(t, keys.map(([kt, v]) => [kt, v[i]] as [number, number]), ease)) as V3;

/** 0 → 1 with a wind-up: the first 30% of `dur` goes back by `back` (e.g. 0.15), then a fast eased action */
export const anticipate = (t: number, t0: number, dur: number, back = 0.15): number => {
  const u = clamp((t - t0) / dur);
  if (u < 0.3) return -back * Math.sin((u / 0.3) * Math.PI * 0.5);
  const v = (u - 0.3) / 0.7;
  return -back + (1 + back) * EASE.out(v);
};
/** 0 → 1 that overshoots by `amount` (0.1 = 10%) and settles */
export const overshoot = (t: number, t0: number, dur: number, amount = 0.1): number => {
  const u = clamp((t - t0) / dur);
  return EASE.out(u) + amount * Math.sin(Math.PI * clamp(u * 1.4 - 0.3)) * (1 - u);
};
/** a decaying wobble after an impact at t0: 0 before, then 1 → 0 oscillating (multiply by your amplitude) */
export const settle = (t: number, t0: number, freq = 3, damp = 5): number => {
  const s = t - t0;
  if (s < 0) return 0;
  return Math.exp(-damp * s) * Math.cos(2 * Math.PI * freq * s);
};

/** a jump starting at t0 lasting dur: y (m, ×height), and squash for <Character3D squash>:
 *  crouch (squash −) → take-off stretch (+) → air → landing squash (−) → settle */
export const hop = (t: number, t0: number, dur = 0.55, height = 0.12): { y: number; squash: number } => {
  const crouch = 0.12;
  const s = t - t0;
  if (s < -crouch || s > dur + 0.35) return { y: 0, squash: 0 };
  if (s < 0) return { y: 0, squash: -0.1 * Math.sin(((s + crouch) / crouch) * Math.PI * 0.5) };
  if (s <= dur) {
    const u = s / dur;
    const y = 4 * u * (1 - u) * height;
    const sq = 0.12 * Math.exp(-u * 6) - 0.04 * Math.exp(-(1 - u) * 8);
    return { y, squash: sq };
  }
  return { y: 0, squash: -0.12 * settle(t, t0 + dur, 3.2, 7) };
};

/** secondary motion: a damped spring following `f(t)` (any number: an angle, an offset). freq Hz, damp 0..1.
 *  Integrated from t - window at a fixed step, so it is a pure function of t. */
export const secondary = (f: (t: number) => number, t: number, o: { freq?: number; damp?: number; window?: number } = {}): number => {
  const w = 2 * Math.PI * (o.freq ?? 2.2);
  const z = o.damp ?? 0.35;
  const win = o.window ?? 1.6;
  const dt = 1 / 120;
  let t0 = Math.max(0, t - win);
  t0 = Math.floor(t0 / dt) * dt; // a fixed grid: every frame integrates the same samples
  let x = f(t0);
  let v = 0;
  for (let s = t0; s < t - 1e-9; s += dt) {
    const h = Math.min(dt, t - s);
    const a = w * w * (f(s) - x) - 2 * z * w * v;
    v += a * h;
    x += v * h;
  }
  return x;
};

/** walk a path (polyline of feet positions) at `speed` m/s starting at t0. Returns the position, the yaw (facing the
 * walk direction, turning smoothly), the walk phase matched to the step length of a character of `height`
 * (no foot sliding), and whether it is still moving. Pass phase as pose.walk only while moving. */
export const walkAlong = (t: number, path: V3[], o: { t0?: number; speed?: number; height?: number } = {}) => {
  const speed = o.speed ?? 1.0;
  const h = o.height ?? 1.7;
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[2] - path[i][2]));
  const total = segs.reduce((a, b) => a + b, 0);
  // ease in and out over the first and last 0.4 m
  const tt = Math.max(0, t - (o.t0 ?? 0));
  const ramp = 0.4;
  const tFull = total / speed + ramp / speed;
  const dist = (() => {
    if (tt >= tFull) return total;
    const accelT = ramp / speed;
    if (tt < accelT) return (speed * tt * tt) / (2 * accelT);
    const d = speed * (tt - accelT / 2);
    if (d > total - ramp / 2) {
      const rem = tFull - tt;
      return total - (speed * rem * rem) / (2 * accelT);
    }
    return d;
  })();
  let d = clamp(dist, 0, total);
  let i = 0;
  while (i < segs.length - 1 && d > segs[i]) {
    d -= segs[i];
    i++;
  }
  const a = path[i];
  const b = path[i + 1] ?? a;
  const u = segs[i] ? d / segs[i] : 0;
  const pos: V3 = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  const yawOf = (k: number) => Math.atan2(path[k + 1][0] - path[k][0], path[k + 1][2] - path[k][2]);
  let yaw = yawOf(Math.min(i, segs.length - 1));
  // turn into the next segment over the last 0.35 m
  if (i + 1 < segs.length && segs[i] - d < 0.35) {
    const y2 = yawOf(i + 1);
    const k = 1 - (segs[i] - d) / 0.35;
    yaw += Math.atan2(Math.sin(y2 - yaw), Math.cos(y2 - yaw)) * k;
  }
  // one full walk cycle (2 steps) ≈ 0.34 h (the feet swing ±0.085 h): phase advances 2π per cycle
  const phase = (dist / (0.34 * h)) * 2 * Math.PI;
  return { pos, yaw, phase, moving: dist < total - 1e-3 && tt > 0, dist, total };
};

/** named expressions for <Character3D face={...}> (spread and override: {...EXPRESSIONS.happy, look: 0.3}) */
export const EXPRESSIONS: Record<string, FaceState> = {
  neutral: { eyes: "open", mouth: "flat", brows: "neutral" },
  happy: { eyes: "open", mouth: "smile", brows: "raised" },
  laugh: { eyes: "squint", mouth: "grin", brows: "raised", flush: 0.25 },
  proud: { eyes: "half", mouth: "smirk", brows: "raised" },
  sad: { eyes: "half", mouth: "frown", brows: "worried" },
  crying: { eyes: "closed", mouth: "frown", brows: "worried", flush: 0.3 },
  angry: { eyes: "angry", mouth: "frown", brows: "angry", flush: 0.35 },
  furious: { eyes: "angry", mouth: "yell", brows: "angry", flush: 0.6 },
  surprised: { eyes: "wide", mouth: "o", brows: "raised" },
  shocked: { eyes: "wide", mouth: "yell", brows: "raised", sweat: true },
  scared: { eyes: "wide", mouth: "frown", brows: "worried", sweat: true },
  thinking: { eyes: "half", mouth: "flat", brows: "worried", look: 0.5 },
  doubtful: { eyes: "squint", mouth: "smirk", brows: "angry", look: -0.3 },
  sleepy: { eyes: "half", mouth: "flat", brows: "neutral" },
  determined: { eyes: "squint", mouth: "flat", brows: "angry" },
  embarrassed: { eyes: "half", mouth: "smile", brows: "worried", flush: 0.7, look: -0.4 },
  excited: { eyes: "wide", mouth: "grin", brows: "raised", flush: 0.2 },
  talking: { eyes: "open", mouth: "open", brows: "raised" },
};

/** a simple talking mouth for a speaking character: opens on the words of the voice-over (no lip-sync needed).
 * words: [text, start s, end s]. Returns the mouth to use at time t. */
export const talkMouth = (t: number, words: [string, number, number][], rest: FaceState["mouth"] = "smile"): FaceState["mouth"] => {
  for (const [, a, b] of words) {
    if (t >= a && t <= b) {
      // cycle open / o / flat about 5 shapes a second, like loose speech; no phoneme matching needed
      const k = Math.floor((t - a) * 5) % 3;
      return k === 0 ? "open" : k === 1 ? "o" : "flat";
    }
  }
  return rest;
};
