// Three example characters of the family, ready to spread into <Character3D {...CAST.adult} position={...} />.
// Copy one and change the overrides to design your own: build (proportions), look (skin, outfit, colors, hair, hat,
// glasses, facial hair, face style). Keep every character of a film inside one family (family.ts).
import type { CharacterSpec } from "./Character3D";
import { CHUBBY_BUILD, CLOTH, ELDER_BUILD, HAIR, KID_BUILD, SKIN, SLIM_BUILD, STRONG_BUILD, TEEN_BUILD } from "./family";

export const CAST = {
  /** an adult: block torso, open jacket over a shirt, swept hair, a hook nose */
  adult: {
    height: 1.74,
    build: { torso: "block", torsoWidth: 1.02 },
    look: {
      skin: SKIN.medium,
      outfit: "jacket",
      colors: { top: CLOTH.teal, inner: CLOTH.cream, bottom: CLOTH.charcoal, shoes: CLOTH.oxblood, accent: CLOTH.horn },
      hair: "swoop",
      hairColor: HAIR.espresso,
      face: { nose: "hook", blush: 0.22, brow: 1.1 },
      seed: 3,
    },
  },
  /** a kid: a bigger head (1.32x), a barrel torso, shorter arms and legs, overalls, a cap, curly hair */
  kid: {
    height: 1.16,
    build: KID_BUILD,
    look: {
      skin: SKIN.brown,
      outfit: "overalls",
      colors: { top: CLOTH.denim, inner: CLOTH.mustard, bottom: CLOTH.denim, shoes: CLOTH.brick, accent: CLOTH.brass },
      hair: "curly",
      hairColor: HAIR.black,
      hat: "cap",
      face: { nose: "button", blush: 0.5, lash: true, eyeColor: "#2a1d1a" },
      seed: 6,
    },
  },
  /** an elder: a pear torso, a 9° stoop, silver hair in a bun, round glasses, smile lines, an apron over a print dress */
  elder: {
    height: 1.62,
    build: ELDER_BUILD,
    look: {
      skin: SKIN.fair,
      outfit: "apron",
      colors: { top: CLOTH.mustard, inner: CLOTH.rose, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream },
      hair: "bun",
      hairColor: HAIR.silver,
      glasses: true,
      face: { nose: "button", blush: 0.3, lines: true, brow: 1.25, eyeColor: "#4a5a6a" },
      seed: 9,
    },
  },
  /** a woman: slim build, bob haircut, a sweater over a shirt, lashes */
  woman: {
    height: 1.66,
    build: SLIM_BUILD,
    look: {
      skin: SKIN.light,
      outfit: "sweater",
      colors: { top: CLOTH.rose, inner: CLOTH.cream, bottom: CLOTH.denim, shoes: CLOTH.chestnut, accent: CLOTH.cream },
      hair: "bob",
      hairColor: HAIR.auburn,
      face: { nose: "button", blush: 0.4, lash: true, eyeColor: "#3a5a3a" },
      seed: 12,
    },
  },
  /** a teen: a bigger head, a beanie, a vest over a shirt */
  teen: {
    height: 1.52,
    build: TEEN_BUILD,
    look: {
      skin: SKIN.tan,
      outfit: "vest",
      colors: { top: CLOTH.cobalt, inner: CLOTH.mustard, bottom: CLOTH.charcoal, shoes: CLOTH.brick, accent: CLOTH.cream },
      hair: "crop",
      hairColor: HAIR.black,
      hat: "beanie",
      face: { nose: "button", blush: 0.35 },
      seed: 15,
    },
  },
  /** a chubby shopkeeper: barrel torso, apron, mustache */
  shopkeeper: {
    height: 1.7,
    build: CHUBBY_BUILD,
    look: {
      skin: SKIN.fair,
      outfit: "apron",
      colors: { top: CLOTH.sage, inner: CLOTH.cream, bottom: CLOTH.cocoa, shoes: CLOTH.chestnut, accent: CLOTH.cream },
      hair: "sides",
      hairColor: HAIR.espresso,
      mustache: true,
      face: { nose: "button", blush: 0.45 },
      seed: 18,
    },
  },
  /** a strong worker: broad block torso, overalls, a flat cap */
  worker: {
    height: 1.8,
    build: STRONG_BUILD,
    look: {
      skin: SKIN.deep,
      outfit: "overalls",
      colors: { top: CLOTH.khaki, inner: CLOTH.brick, bottom: CLOTH.khaki, shoes: CLOTH.graphite, accent: CLOTH.brass },
      hair: "crop",
      hairColor: HAIR.black,
      hat: "flat",
      beard: true,
      face: { nose: "hook", blush: 0.15, brow: 1.3 },
      seed: 21,
    },
  },
  /** a scholar / scientist / narrator-expert: jacket, glasses, swept silver hair */
  scholar: {
    height: 1.76,
    build: { torso: "pear", torsoWidth: 1.0 },
    look: {
      skin: SKIN.medium,
      outfit: "jacket",
      colors: { top: CLOTH.charcoal, inner: CLOTH.cream, bottom: CLOTH.graphite, shoes: CLOTH.oxblood, accent: CLOTH.horn },
      hair: "swoop",
      hairColor: HAIR.silver,
      glasses: true,
      face: { nose: "hook", blush: 0.2, lines: true },
      seed: 24,
    },
  },
} satisfies Record<string, CharacterSpec>;
