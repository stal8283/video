// Hand props for Character3D: mug, key, book, phone. Built in character units (h = 1); local +y points along the
// forearm, away from the elbow, and the origin is the hand center. Every prop is lit and inked like the character.
import React from "react";
import * as THREE from "three";
import { CLOTH } from "./family";
import { Inked } from "./Inked";
import { charMat } from "./material";

export type HandPropKind = "mug" | "key" | "book" | "phone" | "scroll" | "coin" | "lantern" | "flower" | "sword" | "letter" | "torch" | "apple" | "magnifier" | "flag";
export const HAND_PROPS: HandPropKind[] = ["mug", "key", "book", "phone", "scroll", "coin", "lantern", "flower", "sword", "letter", "torch", "apple", "magnifier", "flag"];

const rounded = (w: number, h: number, d: number, r: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: d * 0.2, bevelSize: Math.min(r * 0.5, d * 0.3), bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -d / 2);
  return g;
};

let geos: Record<string, THREE.BufferGeometry> | null = null;
const G = () => {
  if (geos) return geos;
  const cyl = (r0: number, r1: number, len: number, y: number, seg = 24) => {
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, false);
    g.translate(0, y + len / 2, 0);
    return g;
  };
  // key: a round bow with a hole, a shaft, two bits
  const bow = new THREE.TorusGeometry(0.019, 0.0075, 12, 30);
  bow.translate(0, -0.022, 0);
  const shaft = cyl(0.0058, 0.0058, 0.072, -0.005, 14);
  const bit1 = new THREE.BoxGeometry(0.007, 0.018, 0.022);
  bit1.translate(0, 0.055, 0.013);
  const bit2 = new THREE.BoxGeometry(0.007, 0.01, 0.014);
  bit2.translate(0, 0.036, 0.01);
  // mug: a tapered body, a stripe, a handle, a drink surface
  const mug = cyl(0.034, 0.037, 0.075, -0.034, 28);
  const stripe = cyl(0.0372, 0.0378, 0.012, 0.016, 28);
  const drink = new THREE.CylinderGeometry(0.033, 0.033, 0.003, 28);
  drink.translate(0, 0.036, 0);
  const handle = new THREE.TorusGeometry(0.019, 0.0062, 10, 22, Math.PI * 1.25);
  handle.rotateZ(-Math.PI * 0.62);
  handle.translate(0.039, 0.003, 0);
  // book: covers, page block, a spine band
  const cover = rounded(0.1, 0.135, 0.022, 0.006);
  const pages = new THREE.BoxGeometry(0.093, 0.127, 0.019);
  pages.translate(0.004, 0, 0);
  const band = new THREE.BoxGeometry(0.008, 0.137, 0.024);
  band.translate(-0.046, 0, 0);
  // phone: a rounded slab, a screen, a camera dot (no brand)
  const phone = rounded(0.044, 0.088, 0.008, 0.008);
  const screen = rounded(0.038, 0.078, 0.001, 0.006);
  screen.translate(0, 0, 0.0052);
  const cam = new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12);
  cam.rotateX(Math.PI / 2);
  cam.translate(0.01, 0.034, -0.0055);
  // scroll: a paper roll with two wooden end knobs
  const roll = new THREE.CylinderGeometry(0.016, 0.016, 0.12, 20);
  roll.rotateZ(Math.PI / 2);
  const knob = new THREE.SphereGeometry(0.011, 14, 10);
  // coin: a thick disc with a rim
  const coin = new THREE.CylinderGeometry(0.02, 0.02, 0.005, 28);
  coin.rotateX(Math.PI / 2);
  const coinRim = new THREE.TorusGeometry(0.019, 0.0022, 8, 28);
  // lantern: a frame box, glass, a top cap and a ring
  const lanFrame = new THREE.BoxGeometry(0.062, 0.085, 0.062);
  const lanGlass = new THREE.BoxGeometry(0.05, 0.07, 0.05);
  const lanCap = new THREE.ConeGeometry(0.048, 0.035, 4);
  lanCap.rotateY(Math.PI / 4);
  lanCap.translate(0, 0.06, 0);
  const lanRing = new THREE.TorusGeometry(0.014, 0.003, 8, 18);
  lanRing.translate(0, 0.088, 0);
  // flower: a stem, a ball of petals, a center
  const stem = new THREE.CylinderGeometry(0.003, 0.003, 0.14, 8);
  stem.translate(0, 0.05, 0);
  const petal = new THREE.SphereGeometry(0.014, 12, 8);
  const blossom = new THREE.SphereGeometry(0.012, 12, 8);
  // sword: blade, guard, grip, pommel (cartoon proportions, no sharp detail)
  const blade = new THREE.BoxGeometry(0.018, 0.34, 0.005);
  blade.translate(0, 0.21, 0);
  const tip = new THREE.ConeGeometry(0.0128, 0.03, 4);
  tip.scale(1, 1, 0.28);
  tip.translate(0, 0.395, 0);
  const guard = new THREE.BoxGeometry(0.07, 0.012, 0.014);
  guard.translate(0, 0.035, 0);
  const grip = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 12);
  const pommel = new THREE.SphereGeometry(0.011, 12, 8);
  pommel.translate(0, -0.035, 0);
  // letter: an envelope with a seal
  const env = rounded(0.11, 0.07, 0.003, 0.004);
  const seal = new THREE.CylinderGeometry(0.009, 0.009, 0.003, 16);
  seal.rotateX(Math.PI / 2);
  seal.translate(0, 0, 0.003);
  // torch: a wooden stick and a wrapped head (the flame is added by the scene: kit Flame at the hand + 0.2 h)
  const stick = new THREE.CylinderGeometry(0.009, 0.007, 0.22, 10);
  stick.translate(0, 0.06, 0);
  const wrap = new THREE.CylinderGeometry(0.016, 0.013, 0.04, 12);
  wrap.translate(0, 0.17, 0);
  // apple
  const apple = new THREE.SphereGeometry(0.03, 20, 14);
  apple.scale(1, 0.9, 1);
  const appleStem = new THREE.CylinderGeometry(0.002, 0.002, 0.016, 6);
  appleStem.translate(0, 0.032, 0);
  // magnifier: a ring lens and a handle
  const lensRing = new THREE.TorusGeometry(0.03, 0.005, 10, 28);
  lensRing.translate(0, 0.11, 0);
  const lens = new THREE.CylinderGeometry(0.029, 0.029, 0.002, 28);
  lens.rotateX(Math.PI / 2);
  lens.translate(0, 0.11, 0);
  const mHandle = new THREE.CylinderGeometry(0.007, 0.007, 0.08, 10);
  mHandle.translate(0, 0.04, 0);
  // flag: a pole and a cloth
  const pole = new THREE.CylinderGeometry(0.004, 0.004, 0.36, 8);
  pole.translate(0, 0.14, 0);
  const cloth = new THREE.BoxGeometry(0.12, 0.08, 0.003);
  cloth.translate(0.062, 0.27, 0);
  geos = { bow, shaft, bit1, bit2, mug, stripe, drink, handle, cover, pages, band, phone, screen, cam, roll, knob, coin, coinRim, lanFrame, lanGlass, lanCap, lanRing, stem, petal, blossom, blade, tip, guard, grip, pommel, env, seal, stick, wrap, apple, appleStem, lensRing, lens, mHandle, pole, cloth };
  return geos;
};

export const HandProp: React.FC<{ kind: HandPropKind }> = ({ kind }) => {
  const g = G();
  switch (kind) {
    case "key": {
      const metal = charMat(CLOTH.brass, { spec: 0.9, gloss: 0.5 });
      return (
        <group position={[0, 0.012, 0.018]}>
          <Inked geo={g.bow} mat={metal} ink={0.0042} />
          <Inked geo={g.shaft} mat={metal} ink={0.004} />
          <Inked geo={g.bit1} mat={metal} ink={0.0036} />
          <Inked geo={g.bit2} mat={metal} ink={0.0036} />
        </group>
      );
    }
    case "mug":
      return (
        <group position={[0, 0.01, 0.034]}>
          <Inked geo={g.mug} mat={charMat(CLOTH.cream, { spec: 0.6, gloss: 0.3 })} ink={0.0055} />
          <Inked geo={g.stripe} mat={charMat(CLOTH.teal, { spec: 0.5 })} ink={0} />
          <Inked geo={g.drink} mat={charMat("#6a3e28", { spec: 0.5, gloss: 0.4 })} ink={0} />
          <Inked geo={g.handle} mat={charMat(CLOTH.cream, { spec: 0.4 })} ink={0.0045} />
        </group>
      );
    case "book":
      return (
        <group position={[0, 0.03, 0.03]} rotation={[0.25, 0, 0]}>
          <Inked geo={g.cover} mat={charMat(CLOTH.brick, { spec: 0.25 })} ink={0.005} />
          <Inked geo={g.pages} mat={charMat(CLOTH.cream, { spec: 0.05 })} ink={0} />
          <Inked geo={g.band} mat={charMat(CLOTH.mustard, { spec: 0.3 })} ink={0.0035} />
        </group>
      );
    case "phone":
      return (
        <group position={[0, 0.03, 0.03]} rotation={[0.35, 0, 0]}>
          <Inked geo={g.phone} mat={charMat(CLOTH.graphite, { spec: 0.6, gloss: 0.4 })} ink={0.004} />
          <Inked geo={g.screen} mat={charMat("#1f3b5c", { spec: 0.8, gloss: 0.6, emissive: "#163049" })} ink={0} />
          <Inked geo={g.cam} mat={charMat("#101218", { spec: 1 })} ink={0} />
        </group>
      );
    case "scroll": {
      const wood = charMat("#7a4a2a", { spec: 0.3 });
      return (
        <group position={[0, 0.02, 0.03]}>
          <Inked geo={g.roll} mat={charMat("#f0e2c0", { spec: 0.05 })} ink={0.004} />
          <Inked geo={g.knob} mat={wood} ink={0.003} position={[0.068, 0, 0]} />
          <Inked geo={g.knob} mat={wood} ink={0.003} position={[-0.068, 0, 0]} />
        </group>
      );
    }
    case "coin":
      return (
        <group position={[0, 0.03, 0.02]}>
          <Inked geo={g.coin} mat={charMat("#e0b040", { spec: 1.0, gloss: 0.7 })} ink={0.003} />
          <Inked geo={g.coinRim} mat={charMat("#b8862a", { spec: 0.9 })} ink={0} />
        </group>
      );
    case "lantern":
      return (
        <group position={[0, -0.07, 0.02]}>
          <Inked geo={g.lanFrame} mat={charMat(CLOTH.graphite, { spec: 0.6 })} ink={0.004} />
          <Inked geo={g.lanGlass} mat={charMat("#ffd27a", { emissive: "#ffb040", spec: 0.2 })} ink={0} />
          <Inked geo={g.lanCap} mat={charMat(CLOTH.graphite, { spec: 0.6 })} ink={0.004} />
          <Inked geo={g.lanRing} mat={charMat(CLOTH.graphite, { spec: 0.6 })} ink={0} />
          <pointLight position={[0, 0, 0]} color="#ffb860" intensity={0.6} distance={2} decay={2} />
        </group>
      );
    case "flower":
      return (
        <group position={[0, 0.02, 0.02]}>
          <Inked geo={g.stem} mat={charMat("#4a8a3a")} ink={0} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Inked key={i} geo={g.petal} mat={charMat(CLOTH.rose)} ink={0.003} position={[Math.cos(i * 1.2566) * 0.016, 0.125, Math.sin(i * 1.2566) * 0.016]} />
          ))}
          <Inked geo={g.blossom} mat={charMat(CLOTH.mustard)} ink={0} position={[0, 0.13, 0]} />
        </group>
      );
    case "sword": {
      const steel = charMat("#c8d0dc", { spec: 1.0, gloss: 0.8 });
      const gold = charMat("#c99f4b", { spec: 0.9, gloss: 0.5 });
      return (
        <group position={[0, 0.0, 0.0]}>
          <Inked geo={g.blade} mat={steel} ink={0.0035} />
          <Inked geo={g.tip} mat={steel} ink={0.0035} />
          <Inked geo={g.guard} mat={gold} ink={0.0035} />
          <Inked geo={g.grip} mat={charMat("#5a3a2b")} ink={0.003} />
          <Inked geo={g.pommel} mat={gold} ink={0.003} />
        </group>
      );
    }
    case "letter":
      return (
        <group position={[0, 0.03, 0.03]} rotation={[0.3, 0, 0]}>
          <Inked geo={g.env} mat={charMat("#f2e6cc", { spec: 0.05 })} ink={0.0035} />
          <Inked geo={g.seal} mat={charMat("#a02a2a", { spec: 0.5 })} ink={0} />
        </group>
      );
    case "torch":
      return (
        <group position={[0, 0, 0.0]}>
          <Inked geo={g.stick} mat={charMat("#6a4428", { spec: 0.2 })} ink={0.0035} />
          <Inked geo={g.wrap} mat={charMat("#8a6a48", { spec: 0.1 })} ink={0.0035} />
        </group>
      );
    case "apple":
      return (
        <group position={[0, 0.03, 0.03]}>
          <Inked geo={g.apple} mat={charMat("#c8302a", { spec: 0.8, gloss: 0.5 })} ink={0.004} />
          <Inked geo={g.appleStem} mat={charMat("#5a3a20")} ink={0} />
        </group>
      );
    case "magnifier":
      return (
        <group position={[0, 0.0, 0.02]}>
          <Inked geo={g.mHandle} mat={charMat("#5a3a2b", { spec: 0.4 })} ink={0.003} />
          <Inked geo={g.lensRing} mat={charMat("#c99f4b", { spec: 0.9 })} ink={0.003} />
          <Inked geo={g.lens} mat={charMat("#bfe0f0", { spec: 1.0, gloss: 0.9 })} ink={0} />
        </group>
      );
    case "flag":
      return (
        <group position={[0, 0, 0]}>
          <Inked geo={g.pole} mat={charMat("#6a4428", { spec: 0.3 })} ink={0.003} />
          <Inked geo={g.cloth} mat={charMat(CLOTH.brick, { spec: 0.1 })} ink={0.0035} />
        </group>
      );
    default:
      return null;
  }
};
