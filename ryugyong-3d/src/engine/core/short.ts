// Plan-driven timing for a Short: which shot is on screen, the camera of that shot with its word-anchored beats,
// and the camera MOVE that carries one shot into the next (the move is the cut: no hard cuts).
//
//   const cam = shortCam(t, SHOTS, BEATS, (id, t) => baseCamOf(id, t));
//
// baseCamOf(id, t) returns the resting lens of a shot (it may follow a walking character: any pure function of t).
// BEATS inside a shot move the camera from that base; between beats the rig drifts so the frame never freezes.
import type { Beat, BeatPrm, Cam } from "./rig";
import { poseAt } from "./rig";

export type PlanShot = { readonly id: string; readonly t: number; readonly end: number; readonly set: string; readonly mood: string; readonly note: string };
export type PlanBeat = { readonly t: number; readonly move: string; readonly word: string; readonly prm: Readonly<BeatPrm> };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const mixC = (a: Cam, b: Cam, u: number): Cam => ({
  pos: [a.pos[0] + (b.pos[0] - a.pos[0]) * u, a.pos[1] + (b.pos[1] - a.pos[1]) * u, a.pos[2] + (b.pos[2] - a.pos[2]) * u],
  look: [a.look[0] + (b.look[0] - a.look[0]) * u, a.look[1] + (b.look[1] - a.look[1]) * u, a.look[2] + (b.look[2] - a.look[2]) * u],
  fov: a.fov + (b.fov - a.fov) * u,
  roll: (a.roll ?? 0) * (1 - u) + (b.roll ?? 0) * u,
});

/** the index of the shot on screen at t */
export const shotIndex = (t: number, shots: readonly PlanShot[]) => {
  let i = 0;
  while (i + 1 < shots.length && t >= shots[i + 1].t) i++;
  return i;
};

/** a shot's camera at t: its base lens + its own beats */
const shotCam = (i: number, t: number, shots: readonly PlanShot[], beats: readonly PlanBeat[], base: (id: string, t: number) => Cam) => {
  const s = shots[i];
  const own = beats.filter((b) => b.t >= s.t - 0.3 && b.t < s.end - 0.05);
  const B: Beat[] = own.map((b) => ({ t: b.t, move: b.move, dur: b.prm.dur ?? 0, word: b.word }));
  const p = poseAt(base(s.id, t), B, s.t, t, own.map((b) => ({ ...b.prm })));
  return { cam: { pos: p.pos, look: p.look, fov: p.fov, roll: p.roll } as Cam, shake: p.shake };
};

/** the camera of the whole Short at t. A transition of `tr` seconds (default 0.6) blends the outgoing shot's camera
 * into the incoming one, ending just after the new shot's first word. */
export const shortCam = (t: number, shots: readonly PlanShot[], beats: readonly PlanBeat[], base: (id: string, t: number) => Cam, tr = 0.6) => {
  const i = shotIndex(t + tr * 0.85, shots); // the incoming shot starts its move tr*0.85 s before its word
  const cur = shotCam(i, t, shots, beats, base);
  if (i > 0) {
    const t0 = shots[i].t - tr * 0.85;
    const u = clamp((t - t0) / tr);
    if (u < 1) {
      const prev = shotCam(i - 1, t, shots, beats, base);
      return { cam: mixC(prev.cam, cur.cam, ease(u)), shake: 0, shot: shots[i], index: i, blend: u };
    }
  }
  return { cam: cur.cam, shake: cur.shake, shot: shots[i], index: i, blend: 1 };
};
