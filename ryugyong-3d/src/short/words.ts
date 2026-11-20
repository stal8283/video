// Word anchors shared by the acting (Short.tsx) and the sound cues (sfx.ts): the nth time a word is spoken.
import { WORDS } from "../plan.gen";
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export const at = (w: string, occ = 1) => {
  let k = 0;
  for (const x of WORDS) if (norm(x[0]) === w && ++k === occ) return x[1];
  throw new Error(`word not in the voice-over: ${w} #${occ}`);
};
/** the end time of the nth occurrence */
export const endOf = (w: string, occ = 1) => {
  let k = 0;
  for (const x of WORDS) if (norm(x[0]) === w && ++k === occ) return x[2];
  throw new Error(`word not in the voice-over: ${w} #${occ}`);
};
