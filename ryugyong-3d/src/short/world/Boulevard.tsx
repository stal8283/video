// Pyongyang boulevard: a wide road running toward the pyramid, sidewalks, apartment blocks with instanced windows,
// lamp posts (warm practicals at night), trees in planters, benches, a bus shelter, a news board, bollards.
// Three depth layers: foreground props near the lens, the cast's sidewalk (z ≈ 0), the blocks and the pyramid.
import React, { useMemo } from "react";
import * as THREE from "three";
import { boxG, canvasTex, coreMat, cylG, M, sphG } from "../../engine/core/kit";
import { Tree } from "../../engine/sets/props";
import type { V3 } from "../../engine/types";

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const WALK_Y = 0.15; // sidewalk top
export const PYR_Z = -130; // the pyramid stands at the end of the boulevard

type Era = "night" | "day" | "cold";

/** one apartment block; windows are one instanced mesh per block (unlit cores: lit at night, glass by day) */
const winGeo = new THREE.BoxGeometry(1, 1, 1);
const Block: React.FC<{ p: V3; w: number; h: number; d: number; wall: string; era: Era; seed: number; yaw?: number }> = ({ p, w, h, d, wall, era, seed, yaw = 0 }) => {
  const floors = Math.floor(h / 3.1), cols = Math.floor(w / 2.6);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(winGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), floors * cols);
    m.userData.outline = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(floors * cols * 3), 3);
    return m;
  }, [floors, cols]);
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  let i = 0;
  for (let f = 0; f < floors; f++) for (let k = 0; k < cols; k++) {
    o.position.set(-w / 2 + (k + 0.5) * (w / cols), 1.6 + f * 3.1, d / 2 + 0.02);
    o.scale.set(1.3, 1.5, 0.04);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    const s = seed * 977 + f * 31 + k;
    if (era === "night") c.set(hash(s) < 0.38 ? (hash(s + 1) < 0.5 ? "#ffc878" : "#ffe0a8") : "#1c2440").multiplyScalar(hash(s) < 0.38 ? 0.95 : 1);
    else if (era === "cold") c.set(hash(s) < 0.08 ? "#c8d8e0" : "#46525c");
    else c.set(hash(s) < 0.5 ? "#6f8fa8" : "#87a6bc");
    mesh.setColorAt(i, c);
    i++;
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(w, h, d)} c={wall} tex="plaster" p={[0, h / 2, 0]} />
      <M g={boxG(w + 0.3, 0.5, d + 0.3)} c="#6e6a64" tex="stone" p={[0, h + 0.25, 0]} />
      <M g={boxG(w + 0.04, 2.2, d + 0.04)} c="#7a7268" tex="stone" p={[0, 1.1, 0]} />
      <primitive object={mesh} />
    </group>
  );
};

export const LampPost: React.FC<{ p: V3; on: number }> = ({ p, on }) => (
  <group position={p}>
    <M g={cylG(0.07, 0.1, 4.2, 12)} c="#2a3238" tex="metal" p={[0, 2.1, 0]} />
    <M g={boxG(0.9, 0.08, 0.08)} c="#2a3238" tex="metal" p={[0.35, 4.1, 0]} />
    <M g={cylG(0.22, 0.14, 0.14, 12)} c="#2a3238" p={[0.75, 4.05, 0]} />
    <mesh geometry={sphG(0.13, 14)} material={coreMat("#ffd890", 0.5 + 0.75 * on)} position={[0.75, 3.95, 0]} userData={{ outline: false }} />
    {on > 0 ? <pointLight position={[0.75, 3.7, 0.2]} color="#ffb860" intensity={9 * on} distance={9} decay={2} /> : null}
  </group>
);
const Bench: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    {[0, 1, 2].map((k) => <M key={k} g={boxG(1.6, 0.05, 0.12)} c="#8a5a32" tex="wood" p={[0, 0.45, -0.14 + k * 0.14]} />)}
    {[0, 1].map((k) => <M key={`b${k}`} g={boxG(1.6, 0.12, 0.04)} c="#8a5a32" tex="wood" p={[0, 0.7 + k * 0.16, -0.22]} />)}
    {[-0.7, 0.7].map((x) => <M key={x} g={boxG(0.06, 0.45, 0.4)} c="#2a3238" tex="metal" p={[x, 0.225, 0]} />)}
  </group>
);
const Planter: React.FC<{ p: V3; seed: number }> = ({ p, seed }) => (
  <group position={p}>
    <M g={boxG(1.3, 0.5, 1.3)} c="#9a9288" tex="stone" p={[0, 0.25, 0]} />
    <Tree p={[0, 0.5, 0]} s={0.75} seed={seed} leaf="#4a8a4a" />
  </group>
);
const Bollard: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.09, 0.1, 0.8, 12)} c="#d8d2c4" tex="metal" p={[0, 0.4, 0]} />
    <M g={cylG(0.1, 0.1, 0.08, 12)} c="#c33631" p={[0, 0.66, 0]} />
  </group>
);
const BusShelter: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(3.2, 0.1, 1.3)} c="#2c3e50" tex="metal" p={[0, 2.5, 0]} />
    {[-1.5, 1.5].map((x) => <M key={x} g={boxG(0.08, 2.5, 0.08)} c="#2c3e50" tex="metal" p={[x, 1.25, -0.55]} />)}
    <mesh position={[0, 1.4, -0.6]} material={coreMat("#9ab8c8", 0.55, 0.45)} userData={{ outline: false }}><boxGeometry args={[3.0, 1.9, 0.03]} /></mesh>
    <M g={boxG(2.6, 0.05, 0.35)} c="#8a5a32" tex="wood" p={[0, 0.48, -0.35]} />
  </group>
);
const NewsBoard: React.FC<{ p: V3; yaw?: number }> = ({ p, yaw = 0 }) => {
  const tex = canvasTex("newsboard", 256, 160, (g, w, h) => {
    g.fillStyle = "#efe6d2"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 3 ? "#8a8070" : "#3a3a46"; g.fillRect(14, 14 + i * 15, w - 28 - (i % 4) * 30, 6); }
  });
  return (
    <group position={p} rotation={[0, yaw, 0]}>
      <M g={boxG(1.6, 1.1, 0.12)} c="#5a3a2a" tex="wood" p={[0, 1.35, 0]} />
      <mesh position={[0, 1.35, 0.065]}><planeGeometry args={[1.4, 0.9]} /><meshToonMaterial map={tex} /></mesh>
      {[-0.7, 0.7].map((x) => <M key={x} g={boxG(0.08, 0.85, 0.08)} c="#5a3a2a" tex="wood" p={[x, 0.42, 0]} />)}
    </group>
  );
};

/** the set. `lamps` 0..1 turns the practicals on (night). `pyramid` is rendered by the caller at [0, 0, PYR_Z]. */
export const Boulevard: React.FC<{ era: Era; lamps: number; children?: React.ReactNode }> = ({ era, lamps, children }) => (
  <group>
    {/* ground: the road and two sidewalks with curbs (slabs lifted 1 cm, never coplanar) */}
    <M g={boxG(400, 0.2, 500)} c={era === "cold" ? "#6a6a6e" : "#5a5a64"} tex="stone" ts={2} p={[0, -0.1, -150]} cast={false} />
    <M g={boxG(9, 0.16, 500)} c="#b8b0a2" tex="stone" p={[-13, 0.08, -150]} cast={false} />
    <M g={boxG(9, 0.16, 500)} c="#b8b0a2" tex="stone" p={[13, 0.08, -150]} cast={false} />
    {/* road markings */}
    {Array.from({ length: 30 }, (_, i) => <M key={i} g={boxG(0.2, 0.012, 3)} c="#e8e2d0" p={[0, 0.006, -12 - i * 8]} cast={false} />)}
    {Array.from({ length: 8 }, (_, i) => <M key={`z${i}`} g={boxG(0.6, 0.012, 3.6)} c="#e8e2d0" p={[-3.6 + i * 1.0, 0.006, -7]} cast={false} />)}
    {/* the plaza the cast stands on (z from -4 to 4), the boulevard recedes behind it */}
    <M g={boxG(30, 0.15, 8)} c="#c2b8a8" tex="stone" p={[0, 0.075, 0]} cast={false} />
    <M g={boxG(30, 0.18, 0.3)} c="#8a8478" tex="stone" p={[0, 0.09, -4.1]} cast={false} />
    {/* apartment blocks on both sides, receding toward the pyramid */}
    {Array.from({ length: 7 }, (_, i) => (
      <React.Fragment key={i}>
        <Block p={[-26, 0, -14 - i * 24]} w={16} h={22 + hash(i) * 14} d={12} wall={["#c8b89a", "#b8a890", "#d0c4a8"][i % 3]} era={era} seed={i} yaw={Math.PI / 2} />
        <Block p={[26, 0, -10 - i * 24]} w={16} h={20 + hash(i + 7) * 16} d={12} wall={["#b0a898", "#c4b89c", "#a8a090"][i % 3]} era={era} seed={i + 20} yaw={-Math.PI / 2} />
      </React.Fragment>
    ))}
    {/* lamps (≥ 3 practicals at night), trees, benches, bus shelter, news board, bollards */}
    {[-7.5, 7.5].map((x) => <LampPost key={x} p={[x, 0.15, -3.4]} on={lamps} />)}
    <LampPost p={[-3.2, 0.15, 3.6]} on={lamps} />
    <LampPost p={[-11, 0.15, -30]} on={lamps} />
    <LampPost p={[11, 0.15, -44]} on={lamps} />
    <Planter p={[-5.2, 0.15, -3.2]} seed={2} />
    <Planter p={[5.4, 0.15, -3.2]} seed={5} />
    <Bench p={[-2.6, 0.15, -3.3]} />
    <Bench p={[2.8, 0.15, -3.3]} />
    <BusShelter p={[-9.5, 0.15, -3.0]} />
    <NewsBoard p={[6.6, 0.15, -3.1]} />
    {[-8, -6.5, 6.5, 8].map((x) => <Bollard key={x} p={[x, 0.15, 3.4]} />)}
    {/* foreground: a bollard and a planter corner near the lens (soft in the depth of field) */}
    <Bollard p={[1.9, 0.15, 6.2]} />
    {children}
  </group>
);
