// The Ryugyong cast: every character inside the shipped family (family.ts), invented and unnamed.
import type { CharacterSpec } from "../engine/char/Character3D";
import { CAST } from "../engine/char/cast";
import { CLOTH, HAIR, SKIN } from "../engine/char/family";

/** The Guest: asks the questions; round glasses, teal jacket, mustard accent (the 2D design's signature carried over) */
export const GUEST: CharacterSpec = {
  ...CAST.adult,
  look: { ...CAST.adult.look, skin: SKIN.light, colors: { top: CLOTH.teal, inner: CLOTH.mustard, bottom: CLOTH.charcoal, shoes: CLOTH.chestnut, accent: CLOTH.mustard }, hair: "swoop", hairColor: HAIR.espresso, glasses: "#2a2420", seed: 31 },
};
/** The Clerk: deadpan answers; navy uniform jacket, peaked cap with a maroon band */
export const CLERK: CharacterSpec = {
  height: 1.76,
  build: { torso: "block", torsoWidth: 1.0 },
  look: { skin: SKIN.fair, outfit: "jacket", colors: { top: "#2c3e50", inner: CLOTH.cream, bottom: "#1d2a37", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#2c3e50", hatBand: "#7a2e2a", face: { nose: "button", blush: 0.12, brow: 1.2 }, seed: 33 },
};
/** The Hotel Exec (2012): grey suit jacket, a bun, square-ish glasses */
export const EXEC: CharacterSpec = {
  ...CAST.woman,
  look: { ...CAST.woman.look, skin: SKIN.tan, outfit: "jacket", colors: { top: "#6b7178", inner: CLOTH.cream, bottom: "#3b3d46", shoes: CLOTH.graphite, accent: CLOTH.horn }, hair: "bun", hairColor: HAIR.black, glasses: "#2a2420", seed: 35 },
};
/** Singapore doorman, 1986: maroon coat, cap */
export const DOORMAN: CharacterSpec = {
  ...CAST.adult,
  look: { ...CAST.adult.look, skin: SKIN.tan, outfit: "vest", colors: { top: "#7a2e3a", inner: CLOTH.cream, bottom: "#2a1a1e", shoes: CLOTH.graphite, accent: CLOTH.brass }, hair: "crop", hairColor: HAIR.black, hat: "cap", hatColor: "#7a2e3a", hatBand: CLOTH.brass, seed: 37 },
};
/** builder, 1987: the worker, a yellow cap for a hard hat */
export const BUILDER: CharacterSpec = { ...CAST.worker, look: { ...CAST.worker.look, skin: SKIN.light, hat: "cap", hatColor: "#d6a137", hatBand: "#8c6a1e", beard: false, seed: 39 } };
/** glass fitter, 2011 */
export const FITTER: CharacterSpec = { ...CAST.worker, look: { ...CAST.worker.look, skin: SKIN.brown, outfit: "vest", colors: { top: "#c9773a", inner: "#6b6f73", bottom: CLOTH.charcoal, shoes: CLOTH.graphite, accent: CLOTH.cream }, hat: "cap", hatColor: "#e8e4dc", beard: false, seed: 41 } };
/** a Pyongyang passer-by */
export const PASSER: CharacterSpec = { ...CAST.teen, height: 1.68, look: { ...CAST.teen.look, skin: SKIN.light, outfit: "sweater", colors: { top: "#4d5446", inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.graphite, accent: CLOTH.cream }, hat: "beanie", hatColor: "#2c3e50", seed: 43 } };
