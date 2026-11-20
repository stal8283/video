// The hero object: a 105-floor, three-sided stepped pyramid with a ringed crown, built as real 3D geometry.
// States: "concrete" (bare shell, missing windows, a crane), "glass" (blue-grey glass skin), "lit" (dark glass + LED face).
// Everything is a pure function of its props (t, ledOn, rise, glassRise): no per-tab state.
import React, { useMemo } from "react";
import * as THREE from "three";
import { boxG, canvasTex, coreMat, cylG, Label, M } from "../../engine/core/kit";
import { mapToon } from "../../engine/mat/materials";

export type PyrState = "concrete" | "glass" | "lit";
export const ACCENT = "#8fd23f";
const TIERS = 10;
const BODY = 0.82; // body height as a fraction of H (the crown takes the rest)
const R0 = 0.36, R1 = 0.04; // circumradius of the triangle at the base and at the top of the body (x H)
const STEP = 0.012; // the setback ledge at each tier (x H)
const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const radiusAt = (u: number) => R0 + (R1 - R0) * u; // u = 0..1 up the body

/** a triangular frustum with per-face UVs in meters (u across the face, v up) */
const frustumGeo = (rb: number, rt: number, h: number, uScale: number, vScale: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const ang = [Math.PI / 3, -Math.PI / 3, Math.PI]; // front face between vertices 0 and 1 faces +z
  const P = (r: number, a: number, y: number) => [r * Math.sin(a), y, r * Math.cos(a)];
  for (let f = 0; f < 3; f++) {
    const a0 = ang[f], a1 = ang[(f + 1) % 3];
    const b0 = P(rb, a0, 0), b1 = P(rb, a1, 0), t1 = P(rt, a1, h), t0 = P(rt, a0, h);
    const wb = Math.hypot(b1[0] - b0[0], b1[2] - b0[2]), wt = Math.hypot(t1[0] - t0[0], t1[2] - t0[2]);
    const base = pos.length / 3;
    pos.push(...b0, ...b1, ...t1, ...t0);
    const off = (wb - wt) / 2;
    uv.push(0, 0, wb / uScale, 0, (off + wt) / uScale, h / vScale, off / uScale, h / vScale);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // top cap
  const base = pos.length / 3;
  ang.forEach((a) => { pos.push(...P(rt, a, h)); uv.push(0, 0); });
  idx.push(base, base + 2, base + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
const geoCache = new Map<string, THREE.BufferGeometry>();
const tierGeo = (k: number, H: number) => {
  const key = `${k}|${H}`;
  let g = geoCache.get(key);
  if (!g) {
    if (geoCache.size > 80) geoCache.clear();
    const y0 = (k / TIERS) * BODY * H, y1 = ((k + 1) / TIERS) * BODY * H;
    const rb = radiusAt(k / TIERS) * H, rt = (radiusAt((k + 1) / TIERS) + STEP) * H;
    g = frustumGeo(rb, rt, y1 - y0, H * 0.06, (y1 - y0) / 10);
    g.translate(0, y0, 0);
    geoCache.set(key, g);
  }
  return g;
};

/** painted facade tiles: one tile = 10 floors high, a few bays wide */
const facade = (state: PyrState) => {
  const tex = canvasTex(`pyr-${state}`, 256, 256, (g, w, h) => {
    const base = state === "concrete" ? "#8e8a82" : state === "glass" ? "#6d8c9b" : "#1b2536";
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 10; r++) {
      const y = r * (h / 10);
      // slab line
      g.fillStyle = state === "concrete" ? "#77736b" : state === "glass" ? "#56717f" : "#141c2a";
      g.fillRect(0, y, w, 5);
      for (let c = 0; c < 4; c++) {
        const s = r * 7 + c * 13;
        if (state === "concrete") {
          if (hash(s) < 0.22) continue; // missing / boarded windows
          g.fillStyle = hash(s + 3) < 0.15 ? "#5a4a3a" : "#34322e";
        } else if (state === "glass") {
          g.fillStyle = hash(s) < 0.5 ? "#7f9fae" : "#88a8b6";
        } else {
          g.fillStyle = "#222d42";
        }
        g.fillRect(c * (w / 4) + 6, y + 9, w / 4 - 12, h / 10 - 14);
      }
    }
    if (state === "concrete") { // rust streaks
      g.fillStyle = "rgba(90,70,50,0.25)";
      for (let i = 0; i < 6; i++) g.fillRect(hash(i) * w, hash(i + 9) * h, 4, 30 + hash(i + 4) * 40);
    }
  });
  return mapToon(`pyr-${state}`, tex);
};

/** the national flag on the crown's LED band (shown when the LEDs are on) */
const flagTex = () => canvasTex("pyr-flag", 256, 128, (g, w, h) => {
  g.fillStyle = "#2f5da8"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#f4f1ea"; g.fillRect(0, h * 0.17, w, h * 0.05); g.fillRect(0, h * 0.78, w, h * 0.05);
  g.fillStyle = "#c33631"; g.fillRect(0, h * 0.22, w, h * 0.56);
  g.fillStyle = "#f4f1ea"; g.beginPath(); g.arc(w * 0.33, h / 2, h * 0.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#c33631"; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? h * 0.07 : h * 0.17; g.lineTo(w * 0.33 + Math.cos(a) * r, h / 2 + Math.sin(a) * r); }
  g.fill();
});

const haloTex = () => canvasTex("pyr-halo", 256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(0.45, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

/** LED dots on the front face: InstancedMesh created once, every matrix and color set from t on every render */
const LEDS = (() => {
  const pts: { u: number; x: number; row: number }[] = [];
  for (let row = 2; row < 48; row++) {
    const u = row / 50; // fraction up the body
    const half = radiusAt(u) * Math.sin(Math.PI / 3) - 0.012;
    const n = Math.max(2, Math.round((half / 0.012)));
    for (let k = 0; k <= n; k++) pts.push({ u, x: -half + (2 * half * k) / n, row });
  }
  return pts;
})();
const ledGeo = new THREE.BoxGeometry(1, 1, 1);
const ledMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
const Leds: React.FC<{ H: number; t: number; on: number }> = ({ H, t, on }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(ledGeo, ledMat, LEDS.length);
    m.userData.outline = false;
    m.frustumCulled = false;
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(LEDS.length * 3), 3);
    return m;
  }, []);
  const tilt = Math.atan2((R0 - R1) * 0.5, BODY); // the front face leans back
  const o = new THREE.Object3D();
  const c = new THREE.Color();
  const lit = new THREE.Color("#b4f06a").multiplyScalar(1.5), dim = new THREE.Color("#3e7a2c");
  LEDS.forEach((p, i) => {
    const y = p.u * BODY * H;
    const z = radiusAt(p.u) * 0.5 * H + 0.006 * H;
    const rowOn = Math.min(1, Math.max(0, on * 1.3 - (p.row / 48) * 0.3) * 1.0);
    const wave = 0.5 + 0.5 * Math.sin(t * 2.0 - p.row * 0.33 + Math.sin(p.x * 9 + t * 0.8) * 1.3);
    const s = rowOn > 0 ? 0.0068 * H : 0.0001;
    o.position.set(p.x * H, y, z);
    o.rotation.set(-tilt, 0, 0);
    o.scale.set(s, s, s * 0.4);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
    c.copy(wave > 0.38 ? lit : dim).multiplyScalar(rowOn);
    mesh.setColorAt(i, c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

const Crane: React.FC<{ H: number; stencil?: string; top: number }> = ({ H, stencil, top }) => {
  const s = H / 135; // authored for a 135 m tower
  return (
    <group position={[0, top, 0]} scale={s}>
      <M g={boxG(1.6, 26, 1.6)} c="#c9a23a" tex="metal" p={[0, 13, 0]} />
      <M g={boxG(46, 1.4, 1.4)} c="#c9a23a" tex="metal" p={[8, 26.7, 0]} />
      <M g={boxG(5, 3, 2.4)} c="#5a5852" tex="metal" p={[-12, 25.2, 0]} />
      {stencil ? <Label text={stencil} p={[-12, 25.2, 1.21]} w={4.6} h={2.4} fg="#f4ead6" bg="none" font={0.85} /> : null}
      <M g={boxG(0.25, 14, 0.25)} c="#2a2a2a" p={[28, 19, 0]} />
      <M g={boxG(2.2, 1.2, 2.2)} c="#3a3a3a" p={[28, 11.5, 0]} />
    </group>
  );
};

export const Pyramid3D: React.FC<{
  H: number; state: PyrState; t?: number; ledOn?: number;
  rise?: number; dropAt?: (k: number) => number; glassRise?: number; crane?: boolean; craneStencil?: string;
}> = ({ H, state, t = 0, ledOn = 0, rise = 1, dropAt, glassRise = 0, crane = false, craneStencil }) => {
  const shown = Math.max(0, Math.min(TIERS, Math.ceil(rise * TIERS - 1e-6)));
  const top = (shown / TIERS) * BODY * H;
  const glassTiers = Math.floor(glassRise * TIERS + 1e-6);
  const crownOn = shown === TIERS;
  return (
    <group>
      {Array.from({ length: shown }, (_, k) => {
        const st: PyrState = state === "concrete" && k < glassTiers ? "glass" : state;
        const dy = dropAt ? dropAt(k) * H * 0.06 : 0;
        return <mesh key={k} geometry={tierGeo(k, H)} material={facade(st)} position={[0, dy, 0]} castShadow receiveShadow />;
      })}
      {crownOn ? (
        <group position={[0, BODY * H, 0]}>
          <M g={cylG(0.05 * H, 0.075 * H, 0.15 * H, 8)} c={state === "lit" ? "#1b2536" : state === "glass" || glassTiers >= TIERS ? "#6d8c9b" : "#8e8a82"} tex="metal" p={[0, 0.075 * H, 0]} />
          {[0, 1, 2, 3, 4].map((r) => (
            <M key={r} g={cylG((0.085 - r * 0.007) * H, (0.085 - r * 0.007) * H, 0.008 * H, 8)} c={state === "lit" ? "#26324a" : "#9a968e"} tex="metal" p={[0, (0.02 + r * 0.03) * H, 0]} />
          ))}
          <M g={cylG(0.004 * H, 0.006 * H, 0.06 * H, 8)} c="#3a3a3a" p={[0, 0.18 * H, 0]} />
          {state === "lit" && ledOn > 0.6 ? (
            <mesh position={[0, 0.085 * H, 0.066 * H]} rotation={[-0.12, 0, 0]} userData={{ outline: false }}>
              <planeGeometry args={[0.09 * H, 0.045 * H]} />
              <meshBasicMaterial map={flagTex()} toneMapped={false} transparent opacity={Math.min(1, (ledOn - 0.6) / 0.4)} />
            </mesh>
          ) : null}
        </group>
      ) : null}
      {state === "lit" ? <Leds H={H} t={t} on={ledOn} /> : null}
      {crane ? <Crane H={H} top={top} stencil={craneStencil} /> : null}
      {state === "lit" && ledOn > 0 ? (
        // the hero glow: an unlit additive halo behind the face (bloom carries the rest)
        <mesh position={[0, BODY * H * 0.5, -0.02 * H]} userData={{ outline: false }}>
          <planeGeometry args={[0.95 * H, 1.05 * H]} />
          <meshBasicMaterial map={haloTex()} color={ACCENT} transparent opacity={0.55 * ledOn} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};
void coreMat;
