import React from 'react';
import { W, H, clamp, easeOut, easeInOut, lerp } from '../lib';

/* Flat-set camera: level, square to the back wall.  Depth comes from layers spreading apart.
   cam = { x, y, z }: x/y = screen-space pan (px at depth 1), z = zoom at depth 1. */
export type Cam = { x: number; y: number; z: number };
export type Timing = 'creep' | 'punch' | 'settle' | 'still';

/** One move per shot.  `a` start, `b` end. For 'punch', `p` = frame (shot-local) of the key word, `pz` extra zoom. */
export const camAt = (frame: number, dur: number, a: Cam, b: Cam, timing: Timing, p = 0, pz = 0.1): Cam => {
  const drift = { x: Math.sin(frame / 37) * 2, y: Math.cos(frame / 53) * 1.5 };
  let t = 0;
  if (timing === 'creep') t = frame / Math.max(1, dur);
  else if (timing === 'settle') t = easeOut(frame / Math.max(1, dur / 3));
  else if (timing === 'punch') t = (frame / Math.max(1, dur)) * 0.6;
  t = clamp(t);
  const c = { x: lerp(a.x, b.x, t) + drift.x, y: lerp(a.y, b.y, t) + drift.y, z: lerp(a.z, b.z, t) };
  if (timing === 'punch') {
    const k = easeInOut((frame - p) / 12);
    c.z *= 1 + pz * k;
  }
  return c;
};

/** A parallax layer.  depth: 0.5 far wall … 1 cast line … 1.6 foreground. */
export const Layer: React.FC<{ cam: Cam; depth: number; blur?: number; children: React.ReactNode }> = ({ cam, depth, blur = 0, children }) => {
  const s = Math.pow(cam.z, depth);
  const tx = -cam.x * depth, ty = -cam.y * depth;
  return (
    <g transform={`translate(${W / 2},${H / 2}) scale(${s}) translate(${-W / 2 + tx},${-H / 2 + ty})`} style={blur ? { filter: `blur(${blur}px)` } : undefined}>
      {children}
    </g>
  );
};

/** Vignette: clear to 45% of half-diagonal, `strength` black at the corners. */
export const Vignette: React.FC<{ strength: number; id: string }> = ({ strength, id }) => (
  <>
    <defs>
      <radialGradient id={id} gradientUnits="userSpaceOnUse" cx={W / 2} cy={H / 2} r={Math.hypot(W, H) / 2}>
        <stop offset="0.45" stopColor="#000" stopOpacity={0} />
        <stop offset="0.8" stopColor="#000" stopOpacity={strength * 0.55} />
        <stop offset="1" stopColor="#000" stopOpacity={strength} />
      </radialGradient>
    </defs>
    <rect x={0} y={0} width={W} height={H} fill={`url(#${id})`} />
  </>
);
