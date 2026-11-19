import timings from './data/timings.json';
import type { Mouth } from './rig/Character';

export const FPS = 30;
export const W = 1920, H = 1080;
export const T = timings as {
  fps: number; duration: number; frames: number; loudness: number[];
  segments: { id: string; spk: string; text: string; start: number; end: number }[];
  words: { seg: string; spk: string; word: string; start: number; end: number }[];
};
export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t: number) => Math.pow(clamp(t), 3);
export const easeInOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const rand = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** seconds of the first word matching `w` (case-insensitive, punctuation stripped) inside segment `seg` */
export const wordAt = (seg: string, w: string, nth = 0) => {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');
  const hits = T.words.filter((x) => x.seg === seg && n(x.word) === n(w));
  if (!hits[nth]) throw new Error(`word ${w} not in ${seg}`);
  return hits[nth].start;
};
export const segOf = (id: string) => T.segments.find((s) => s.id === id)!;
export const f = (sec: number) => Math.round(sec * FPS);

/** Mouth for `spk` at absolute frame.
 *  Leads the audio by LEAD frames (animation convention: mouth shapes land on or just before the sound),
 *  uses the peak loudness of a short look-ahead window, holds each shape 2 frames, never the same shape twice running. */
const MOUTHS: Mouth[] = ['closed', 'smallO', 'tallO', 'wide', 'smile'];
const LEAD = 2;
const loudPeak = (fr: number) => {
  let m = 0;
  for (let i = fr + LEAD - 1; i <= fr + LEAD + 1; i++) m = Math.max(m, T.loudness[Math.min(T.loudness.length - 1, Math.max(0, i))] ?? 0);
  return m;
};
const shapeOf = (loud: number, block: number): Mouth =>
  loud < 0.08 ? 'closed' : loud < 0.3 ? 'smallO' : loud < 0.55 ? (rand(block) > 0.5 ? 'smile' : 'smallO') : loud < 0.8 ? 'tallO' : 'wide';
export const mouthFor = (spk: string, absFrame: number): Mouth | null => {
  const t = (absFrame + LEAD) / FPS;
  const seg = T.segments.find((s) => s.spk === spk && t >= s.start && t <= s.end + 0.05);
  if (!seg) return null;
  const block = Math.floor(absFrame / 2);
  const fr = block * 2;
  let m = shapeOf(loudPeak(fr), block);
  const prev = shapeOf(loudPeak(fr - 2), block - 1);
  if (m === prev && m !== 'closed') m = MOUTHS[(MOUTHS.indexOf(m) + 1 + Math.floor(rand(block * 7) * 3)) % MOUTHS.length];
  return m;
};
/** blink ~every 3.2 s, 4 frames, never on frame 0 of the beat */
export const blinkAt = (frame: number, seed: number) => {
  if (frame < 3) return false;
  const period = 96 + Math.floor(rand(seed) * 20);
  const ph = (frame + Math.floor(rand(seed + 1) * period)) % period;
  return ph < 4;
};
