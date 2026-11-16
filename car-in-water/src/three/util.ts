import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { continueRender, delayRender, Easing, interpolate } from "remotion";

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = Easing.bezier(0.45, 0, 0.55, 1); // smooth in-out
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** interpolate with clamping + easing */
export const lerpT = (f: number, [a, b]: [number, number], [x, y]: [number, number], e = ease) =>
  interpolate(f, [a, b], [x, y], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix3 = (a: number[], b: number[], t: number) => a.map((v, i) => mix(v, b[i], t)) as [number, number, number];

/** deterministic pseudo-random */
export const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

let fontsReady: Promise<unknown> | null = null;
const waitFonts = () =>
  (fontsReady ??= Promise.all([
    document.fonts.load('900 100px "Montserrat"'),
    document.fonts.load('700 100px "Montserrat"'),
  ]).catch(() => null));

/** A canvas texture with text, drawn once fonts are loaded. */
export function useTextTexture(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  w = 1024,
  h = 512,
  deps: unknown[] = [],
) {
  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }, [w, h]);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, [canvas]);
  const [handle] = useState(() => delayRender("text texture"));
  useEffect(() => {
    let alive = true;
    waitFonts().then(() => {
      if (!alive) return;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h);
      tex.needsUpdate = true;
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return tex;
}

export const FONT = '"Montserrat", sans-serif';

/** Cartoon timing: overshoot ease used for pose-to-pose snaps. */
export const backOut = (x: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
/** 0→1 snap that starts at frame `at` and lands (with overshoot) in `n` frames. */
export const snap = (f: number, at: number, n = 5) => backOut(clamp((f - at) / n));
/** hold each pose for `n` frames ("animating on twos"). */
export const twos = (f: number, n = 2) => Math.floor(f / n) * n;
