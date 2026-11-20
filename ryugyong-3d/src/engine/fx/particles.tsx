// Weather and atmosphere effects. Every particle's position is a pure function of (t, its index): no simulation
// state, so any frame renders identically in any tab. One InstancedMesh per effect (cheap, one draw call).
// Particles are transparent, so the ink pass skips them (no outlines on rain or dust).
//
//   <Rain   center={[x,0,z]} size={[w,h,d]} t={t} />          slanted streaks, a light splash ring layer optional
//   <Snow   center size t />                                   drifting flakes
//   <Leaves center size t colors />                            tumbling leaves (autumn, a gust)
//   <Dust   center size t />                                   floating motes that catch light (interiors, beams)
//   <Sparks at t />                                            a burst of sparks from a point (impact, fire, magic)
//   <Embers at t />                                            rising glowing embers over a fire or a torch
//   <Confetti center size t t0 />                              a celebration burst falling from t0
//   <LightBeam from to radius color t />                       a soft shaft of light (window, door, spotlight)
//
// Keep counts modest on slow PCs (the `count` prop): the quality "draft" render still draws them, they are cheap.
import React, { useMemo } from "react";
import * as THREE from "three";
import type { V3 } from "../types";

const h = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const fract = (x: number) => x - Math.floor(x);

type InstProps = { geo: THREE.BufferGeometry; mat: THREE.Material; count: number; place: (i: number, m: THREE.Matrix4) => void };
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();
export const compose = (m: THREE.Matrix4, p: V3, rot: V3, s: number | V3) => {
  tmpP.set(p[0], p[1], p[2]);
  tmpQ.setFromEuler(tmpE.set(rot[0], rot[1], rot[2]));
  if (typeof s === "number") tmpS.set(s, s, s);
  else tmpS.set(s[0], s[1], s[2]);
  m.compose(tmpP, tmpQ, tmpS);
};
/** an InstancedMesh whose instance matrices are rewritten on every render (deterministic) */
const Inst: React.FC<InstProps> = ({ geo, mat, count, place }) => {
  const mesh = useMemo(() => {
    const im = new THREE.InstancedMesh(geo, mat, count);
    im.frustumCulled = false;
    im.userData.outline = false;
    return im;
  }, [geo, mat, count]);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    place(i, m);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

const matCache = new Map<string, THREE.MeshBasicMaterial>();
const basic = (color: string, opacity: number, k = 1, additive = false) => {
  const key = `${color}|${opacity}|${k}|${additive}`;
  let m = matCache.get(key);
  if (!m) {
    if (matCache.size > 60) matCache.clear();
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), transparent: true, opacity, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide, fog: true });
    matCache.set(key, m);
  }
  return m;
};
const geos = {
  streak: new THREE.BoxGeometry(0.008, 0.38, 0.008),
  flake: new THREE.IcosahedronGeometry(0.022, 0),
  leaf: (() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.05);
    s.quadraticCurveTo(0.04, 0, 0, 0.05);
    s.quadraticCurveTo(-0.04, 0, 0, -0.05);
    return new THREE.ShapeGeometry(s, 6);
  })(),
  mote: new THREE.IcosahedronGeometry(0.008, 0),
  spark: new THREE.BoxGeometry(0.01, 0.01, 0.07),
  ember: new THREE.IcosahedronGeometry(0.012, 0),
  confetti: new THREE.PlaneGeometry(0.035, 0.022),
};

type Vol = { center: V3; size?: V3; t: number; count?: number };

/** rain: slanted streaks falling fast (about 7 m/s), looping in a box */
export const Rain: React.FC<Vol & { color?: string; wind?: number; opacity?: number }> = ({ center, size = [12, 8, 10], t, count = 700, color = "#c8d4f0", wind = 0.18, opacity = 0.45 }) => (
  <Inst
    geo={geos.streak}
    mat={basic(color, opacity)}
    count={count}
    place={(i, m) => {
      const sp = 6.5 + h(i * 3.1) * 1.5;
      const y = fract(h(i * 1.7) - (t * sp) / size[1]);
      compose(m, [center[0] + (h(i * 2.3) - 0.5) * size[0] + wind * y * size[1], center[1] + y * size[1], center[2] + (h(i * 5.9) - 0.5) * size[2]], [0, 0, -wind], 1);
    }}
  />
);

/** snow: flakes drifting down (about 0.7 m/s) with a slow sideways sway */
export const Snow: React.FC<Vol & { color?: string }> = ({ center, size = [12, 7, 10], t, count = 500, color = "#ffffff" }) => (
  <Inst
    geo={geos.flake}
    mat={basic(color, 0.9)}
    count={count}
    place={(i, m) => {
      const sp = 0.5 + h(i * 3.3) * 0.4;
      const y = fract(h(i * 1.3) - (t * sp) / size[1]);
      const sway = Math.sin(t * (0.6 + h(i) * 0.6) + i) * 0.25;
      compose(m, [center[0] + (h(i * 2.7) - 0.5) * size[0] + sway, center[1] + y * size[1], center[2] + (h(i * 7.1) - 0.5) * size[2]], [t + i, t * 0.7, 0], 0.6 + h(i * 9.1) * 0.8);
    }}
  />
);

/** leaves: tumbling leaves falling with a gust (wind m/s along +x) */
export const Leaves: React.FC<Vol & { colors?: string[]; wind?: number }> = ({ center, size = [10, 6, 8], t, count = 90, colors = ["#d8742a", "#c8502a", "#e0a838", "#9a6a2a"], wind = 0.6 }) => (
  <>
    {colors.map((c, k) => (
      <Inst
        key={c}
        geo={geos.leaf}
        mat={basic(c, 0.98)}
        count={Math.ceil(count / colors.length)}
        place={(j, m) => {
          const i = j * colors.length + k;
          const sp = 0.6 + h(i * 3.7) * 0.5;
          const y = fract(h(i * 1.9) - (t * sp) / size[1]);
          const x = fract(h(i * 2.1) + (t * wind) / size[0]) - 0.5;
          compose(m, [center[0] + x * size[0] + Math.sin(t * 2 + i) * 0.2, center[1] + y * size[1], center[2] + (h(i * 6.3) - 0.5) * size[2]], [t * (1 + h(i)) * 2.5, t * 1.3 + i, Math.sin(t * 3 + i) * 0.8], 1 + h(i * 4.4) * 0.8);
        }}
      />
    ))}
  </>
);

/** dust motes: slow floating specks, best inside a LightBeam or near a lamp (additive, so they glow in light) */
export const Dust: React.FC<Vol & { color?: string; glow?: number }> = ({ center, size = [3, 2.5, 3], t, count = 160, color = "#ffe6b0", glow = 0.9 }) => (
  <Inst
    geo={geos.mote}
    mat={basic(color, 0.55, glow, true)}
    count={count}
    place={(i, m) => {
      const px = h(i * 2.9) + Math.sin(t * 0.13 + i) * 0.04;
      const py = fract(h(i * 1.1) + t * 0.012 * (0.5 + h(i)));
      const pz = h(i * 4.7) + Math.cos(t * 0.11 + i * 1.3) * 0.04;
      compose(m, [center[0] + (px - 0.5) * size[0], center[1] + (py - 0.5) * size[1], center[2] + (pz - 0.5) * size[2]], [0, 0, 0], 0.6 + h(i * 8.3));
    }}
  />
);

/** a burst of sparks from `at`, starting at t0, lasting ~0.8 s (impacts, a forge, a magic moment) */
export const Sparks: React.FC<{ at: V3; t: number; t0: number; count?: number; color?: string; speed?: number }> = ({ at, t, t0, count = 60, color = "#ffc860", speed = 3 }) => {
  const s = t - t0;
  if (s < 0 || s > 1.2) return null;
  return (
    <Inst
      geo={geos.spark}
      mat={basic(color, Math.max(0, 1 - s / 1.2), 2.2, true)}
      count={count}
      place={(i, m) => {
        const a = h(i * 3.1) * Math.PI * 2;
        const el = 0.2 + h(i * 5.3) * 1.1;
        const v = speed * (0.5 + h(i * 7.7));
        const d: V3 = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)];
        const p: V3 = [at[0] + d[0] * v * s, at[1] + d[1] * v * s - 4.9 * s * s, at[2] + d[2] * v * s];
        compose(m, p, [-el + 9.8 * s * 0.3, a + Math.PI / 2, 0], 1);
      }}
    />
  );
};

/** embers rising and fading over a fire or a torch */
export const Embers: React.FC<{ at: V3; t: number; count?: number; spread?: number; height?: number }> = ({ at, t, count = 40, spread = 0.5, height = 2.4 }) => (
  <Inst
    geo={geos.ember}
    mat={basic("#ff9a3a", 0.85, 2.0, true)}
    count={count}
    place={(i, m) => {
      const u = fract(h(i * 1.3) + t * (0.25 + h(i) * 0.2));
      const sw = Math.sin(t * 2 + i * 2.1) * 0.15 * u;
      compose(m, [at[0] + (h(i * 2.2) - 0.5) * spread * (1 - u * 0.5) + sw, at[1] + u * height, at[2] + (h(i * 4.1) - 0.5) * spread], [0, 0, 0], 1.2 * (1 - u));
    }}
  />
);

/** confetti thrown at t0 that flutters down */
export const Confetti: React.FC<Vol & { t0: number; colors?: string[] }> = ({ center, size = [4, 3, 3], t, t0, count = 240, colors = ["#ff5a5a", "#ffd23a", "#4ac0ff", "#7ad85a", "#ff7ad0"] }) => {
  const s = t - t0;
  if (s < 0) return null;
  return (
    <>
      {colors.map((c, k) => (
        <Inst
          key={c}
          geo={geos.confetti}
          mat={basic(c, 1, 1.05)}
          count={Math.ceil(count / colors.length)}
          place={(j, m) => {
            const i = j * colors.length + k;
            const up = 3 + h(i * 1.9) * 2;
            const fall = Math.min(s, 0.6);
            const y = size[1] * 0.4 + up * fall - 4.9 * fall * fall - Math.max(0, s - 0.6) * (0.6 + h(i) * 0.5);
            compose(m, [center[0] + (h(i * 2.7) - 0.5) * size[0] * Math.min(1, s * 2), center[1] + y, center[2] + (h(i * 3.9) - 0.5) * size[2] * Math.min(1, s * 2)], [t * 6 + i, t * 4 + i * 2, 0], 1);
          }}
        />
      ))}
    </>
  );
};

/** thin rising steam over a hot drink or food: small, faint, transparent wisps that rise ~25 cm and fade. Place it
 * at the cup's rim; it never reaches a face held above the cup if `rise` stays ≤ 0.3. */
export const Steam: React.FC<{ at: V3; t: number; count?: number; rise?: number; size?: number; color?: string }> = ({ at, t, count = 10, rise = 0.25, size = 1, color = "#ffffff" }) => (
  <Inst
    geo={geos.mote}
    mat={basic(color, 0.22)}
    count={count}
    place={(i, m) => {
      const u = fract(h(i * 1.7) + t * 0.45);
      const sw = Math.sin(t * 2.2 + i * 1.9 + u * 4) * 0.025 * u;
      compose(m, [at[0] + sw + (h(i * 3.1) - 0.5) * 0.03, at[1] + u * rise, at[2] + (h(i * 5.3) - 0.5) * 0.03], [0, 0, 0], size * (1.2 + u * 2.6) * (1 - u * 0.6));
    }}
  />
);

/** a soft shaft of light from `from` toward `to` (a window beam, a spotlight). Additive, unlit, no ink. Add <Dust>
 * inside it for the classic "light through a window" look. */
export const LightBeam: React.FC<{ from: V3; to: V3; radius?: number; radiusEnd?: number; color?: string; strength?: number }> = ({ from, to, radius = 0.35, radiusEnd = 0.8, color = "#ffe2a8", strength = 0.16 }) => {
  const dir = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const len = dir.length();
  const mid: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(radiusEnd, radius, 1, 32, 8, true);
    // fade toward the far end and toward the cone's rim (vertex colors as alpha-ish brightness)
    const pos = g.attributes.position;
    const col: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + 0.5; // 0 at the source ("from"), 1 at the far end ("to")
      const k = Math.pow(1 - y, 1.3) * Math.min(1, y * 12);
      col.push(k, k, k);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [radius, radiusEnd]);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }),
    [color, strength],
  );
  return <mesh geometry={geo} material={mat} position={mid} quaternion={q} scale={[1, len, 1]} userData={{ outline: false }} />;
};
