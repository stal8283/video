import vo from "../public/voiceover.json";
import { SCENES, findAnchor, norm } from "./script";

export const FPS = 30;
export const DISSOLVE = 8; // frames; new image fully in when its keyword starts
export type Word = { text: string; start: number; end: number };
export const VO = vo as { audio: string | null; duration: number; words: Word[] };
export const WORDS_T = VO.words;
const texts = WORDS_T.map((w) => w.text);

export const TOTAL = Math.ceil(VO.duration * FPS);
export const frameOf = (sec: number) => Math.round(sec * FPS);

/** absolute frame where the word sequence `anchor` starts (n-th occurrence via `from` word index) */
export const wordFrame = (anchor: string, from = 0) => frameOf(WORDS_T[findAnchor(texts, anchor, from)].start);
export const wordIndex = (anchor: string, from = 0) => findAnchor(texts, anchor, from);

let cursor = 0;
export const SCENE_TIMES = SCENES.map((s) => {
  const idx = findAnchor(texts, s.anchor, cursor);
  cursor = idx;
  return { ...s, wordIdx: idx, start: idx === 0 ? 0 : frameOf(WORDS_T[idx].start) - 2 };
}).map((s, i, arr) => ({ ...s, end: i + 1 < arr.length ? arr[i + 1].start : TOTAL }));

export { norm };
