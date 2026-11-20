// Cartoon hands with fingers: a palm, four rounded two-segment fingers and a thumb, posed by a named gesture.
// Built in the hand's local frame used by Character3D (+y along the forearm away from the elbow, the thumb toward +z
// and the body side, the palm facing the body). Sizes are multiples of the hand radius r (character units).
//
// Gestures: "mitten" (the classic ball hand, cheapest: use it on wides and crowds), "relaxed" (default), "open"
// (fingers spread, a greeting or a "stop"), "fist", "point" (index straight), "thumbsUp", "grip" (around a held prop),
// "count1".."count4" (fingers up for a list or a number), "pinch".
// A gesture is a set of curls, so two gestures blend: pass `blend: [from, to, u]` for a smooth change on a beat.
import React from "react";
import * as THREE from "three";
import { sphere } from "./geometry";
import { Inked } from "./Inked";
import { handGeo, mergeGeos } from "./geometry";

export type Gesture = "mitten" | "relaxed" | "open" | "fist" | "point" | "thumbsUp" | "grip" | "count1" | "count2" | "count3" | "count4" | "pinch";
export const GESTURES: Gesture[] = ["mitten", "relaxed", "open", "fist", "point", "thumbsUp", "grip", "count1", "count2", "count3", "count4", "pinch"];

/** per finger curl in degrees [index, middle, ring, little], thumb curl, finger spread (degrees) */
type Curl = { f: [number, number, number, number]; thumb: number; spread: number };
const C = (f: [number, number, number, number], thumb: number, spread: number): Curl => ({ f, thumb, spread });
const CURLS: Record<Exclude<Gesture, "mitten">, Curl> = {
  relaxed: C([22, 28, 34, 40], 20, 4),
  open: C([4, 3, 4, 6], 0, 14),
  fist: C([105, 108, 110, 112], 70, 0),
  point: C([2, 105, 108, 110], 60, 2),
  thumbsUp: C([105, 108, 110, 112], -35, 0),
  grip: C([72, 76, 80, 84], 45, 2),
  count1: C([2, 105, 108, 110], 65, 4),
  count2: C([2, 4, 108, 110], 65, 10),
  count3: C([2, 4, 6, 110], 65, 10),
  count4: C([2, 4, 6, 8], 70, 12),
  pinch: C([55, 30, 36, 42], 50, 6),
};

const fingerGeos = (() => {
  let g: { seg: THREE.BufferGeometry; tip: THREE.BufferGeometry; palm: THREE.BufferGeometry; thumb: THREE.BufferGeometry } | null = null;
  return () => {
    if (g) return g;
    const seg = new THREE.CapsuleGeometry(0.2, 0.34, 4, 10);
    seg.translate(0, 0.17, 0); // origin at the knuckle
    const tip = new THREE.CapsuleGeometry(0.19, 0.24, 4, 10);
    tip.translate(0, 0.12, 0);
    const palm = new THREE.SphereGeometry(1, 24, 16);
    palm.scale(0.5, 0.78, 0.86);
    const thumb = new THREE.CapsuleGeometry(0.22, 0.42, 4, 10);
    thumb.translate(0, 0.21, 0);
    g = { seg, tip, palm, thumb };
    return g;
  };
})();

const D2R = Math.PI / 180;
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const curlOf = (g: Gesture | [Gesture, Gesture, number]): Curl | null => {
  if (Array.isArray(g)) {
    const a = curlOf(g[0]);
    const b = curlOf(g[1]);
    if (!a || !b) return b ?? a;
    const u = g[2];
    return { f: a.f.map((x, i) => lerp(x, b.f[i], u)) as Curl["f"], thumb: lerp(a.thumb, b.thumb, u), spread: lerp(a.spread, b.spread, u) };
  }
  return g === "mitten" ? null : CURLS[g];
};

export type HandProps = {
  gesture: Gesture | [Gesture, Gesture, number];
  /** +1 right hand, -1 left hand (Character3D's a.side) */
  side: number;
  /** hand radius in character units */
  r: number;
  mat: THREE.Material;
  ink: number;
  cast?: boolean;
};

/** one merged mesh per (gesture, side): ONE object for the post ink (no id lines between fingers), one hull */
const handCache = new Map<string, THREE.BufferGeometry>();
const buildHand = (c: Curl, side: number) => {
  const q = (x: number) => Math.round(x / 3) * 3; // 3-degree steps keep the cache small during blends
  const key = [side, ...c.f.map(q), q(c.thumb), q(c.spread)].join("|");
  const hit = handCache.get(key);
  if (hit) return hit;
  const G = fingerGeos();
  const parts: THREE.BufferGeometry[] = [G.palm.clone()];
  const m = new THREE.Matrix4();
  const e = new THREE.Euler();
  const zs = [0.5, 0.17, -0.16, -0.46];
  const lens = [1.0, 1.08, 1.0, 0.82];
  zs.forEach((z, i) => {
    const curl = q(c.f[i]) * D2R;
    const spread = (i - 1.5) * q(c.spread) * D2R * -0.6;
    const L = lens[i];
    const base = new THREE.Matrix4().makeTranslation(0, 0.62, z).multiply(m.makeRotationFromEuler(e.set(spread, 0, 0)));
    const k1 = base.clone().multiply(new THREE.Matrix4().makeRotationZ(side * curl * 0.55)).multiply(new THREE.Matrix4().makeScale(L, L, L));
    parts.push(G.seg.clone().applyMatrix4(k1));
    const k2 = k1.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0.36, 0)).multiply(new THREE.Matrix4().makeRotationZ(side * curl * 0.75));
    parts.push(G.tip.clone().applyMatrix4(k2));
  });
  const th = q(c.thumb);
  const tm = new THREE.Matrix4()
    .makeTranslation(-side * 0.12, 0.05, 0.7)
    .multiply(new THREE.Matrix4().makeRotationFromEuler(e.set((55 - Math.min(th, 40)) * D2R, 0, side * Math.max(0, th) * 0.9 * D2R)));
  parts.push(G.thumb.clone().applyMatrix4(tm));
  const g = mergeGeos(parts);
  if (handCache.size > 400) handCache.clear();
  handCache.set(key, g);
  return g;
};

export const Hand: React.FC<HandProps> = ({ gesture, side, r, mat, ink, cast = true }) => {
  const c = curlOf(gesture);
  if (!c) {
    return (
      <>
        <Inked geo={handGeo()} mat={mat} ink={ink} under={0.4} cast={cast} scale={r} />
        <Inked geo={sphere()} mat={mat} ink={ink * 0.7} under={0.2} cast={cast} position={[-side * r * 0.62, -r * 0.15, r * 0.62]} scale={r * 0.44} />
      </>
    );
  }
  // cartoon hands read bigger than real ones; the fingers need the room
  return <Inked geo={buildHand(c, side)} mat={mat} ink={ink * 0.4} under={0.15} cast={cast} scale={r * 1.3} />;
};
