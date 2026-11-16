import { useMemo } from "react";
import * as THREE from "three";

/**
 * Flat 2D stick-figure character (thick black outline, round white head),
 * built from flat meshes so it sits inside the lit 3D sets — the reference style.
 * Drawn in the XY plane facing +Z. Units: head radius 0.5.
 */
export type Expr = "neutral" | "happy" | "smug" | "shock" | "strain" | "worried" | "determined" | "talk";

type Arm = [number, number]; // shoulder angle, elbow bend (radians, 0 = straight down)

export type FigureProps = {
  expr?: Expr;
  mouthOpen?: number; // 0..1 talking
  look?: [number, number]; // pupil offset -1..1
  armL?: Arm;
  armR?: Arm;
  legL?: Arm;
  legR?: Arm;
  shirt?: string;
  skin?: string;
  hair?: "none" | "kid" | "tuft";
  blink?: boolean;
  sweat?: number; // 0..1
  showBody?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

const BLACK = new THREE.MeshBasicMaterial({ color: "#111111", toneMapped: false });
const WHITE_CACHE: Record<string, THREE.MeshBasicMaterial> = {};
const mat = (c: string) => (WHITE_CACHE[c] ??= new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));

const circle = new THREE.CircleGeometry(1, 48);
const box = new THREE.BoxGeometry(1, 1, 0.001);

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2 - 0.03, h / 2 - r);
  s.quadraticCurveTo(w / 2 - 0.03, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2 + 0.03, h / 2, -w / 2 + 0.03, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(s, 12);
};

const Line: React.FC<{ a: [number, number]; b: [number, number]; w?: number; z?: number; m?: THREE.Material }> = ({ a, b, w = 0.075, z = 0, m = BLACK }) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  return (
    <group position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]} rotation={[0, 0, Math.atan2(dy, dx)]}>
      <mesh geometry={box} material={m} scale={[len + w, w, 1]} />
    </group>
  );
};

const Dot: React.FC<{ p: [number, number]; r: number; z?: number; m?: THREE.Material; sx?: number; sy?: number }> = ({ p, r, z = 0, m = BLACK, sx = 1, sy = 1 }) => (
  <mesh geometry={circle} material={m} position={[p[0], p[1], z]} scale={[r * sx, r * sy, 1]} />
);

/** two-segment limb from a joint; returns end point too */
const limb = (o: [number, number], [a1, a2]: Arm, l1: number, l2: number) => {
  const e: [number, number] = [o[0] + Math.sin(a1) * l1, o[1] - Math.cos(a1) * l1];
  const h: [number, number] = [e[0] + Math.sin(a1 + a2) * l2, e[1] - Math.cos(a1 + a2) * l2];
  return { e, h };
};

const Face: React.FC<{ expr: Expr; mouthOpen: number; look: [number, number]; blink: boolean }> = ({ expr, mouthOpen, look, blink }) => {
  const z = 0.03;
  const lx = look[0] * 0.06;
  const ly = look[1] * 0.05;
  const big = expr === "shock";
  const eyeR = big ? 0.12 : 0.07;
  const eyes: [number, number][] = [
    [-0.17, 0.08],
    [0.17, 0.08],
  ];
  const brow = (side: number) => {
    const tilt =
      expr === "strain" || expr === "determined" ? -0.45 * side : expr === "worried" ? 0.4 * side : expr === "shock" ? 0.15 * side : expr === "smug" ? -0.15 * side : 0;
    const yb = expr === "shock" ? 0.36 : expr === "worried" ? 0.27 : 0.25;
    return (
      <group key={side} position={[side * 0.18, yb, z]} rotation={[0, 0, tilt]}>
        <mesh geometry={box} material={BLACK} scale={[0.17, 0.045, 1]} />
      </group>
    );
  };
  let mouth: React.ReactNode;
  const my = -0.2;
  if (mouthOpen > 0.05 || expr === "shock" || expr === "talk") {
    const o = expr === "shock" ? 1 : mouthOpen;
    mouth = (
      <>
        <Dot p={[0, my]} r={0.1} sx={1.1} sy={0.25 + 0.75 * o} z={z} />
        <Dot p={[0, my - 0.02 * o]} r={0.05} sx={1.1} sy={0.3 * o} z={z + 0.002} m={mat("#e2546b")} />
      </>
    );
  } else if (expr === "happy" || expr === "smug") {
    // smile: arc of dots
    mouth = (
      <>
        {Array.from({ length: 9 }, (_, i) => {
          const a = -Math.PI * 0.85 + (i / 8) * Math.PI * 0.7;
          return <Dot key={i} p={[Math.cos(a) * 0.15 + (expr === "smug" ? 0.03 : 0), my + 0.12 + Math.sin(a) * 0.15]} r={0.025} z={z} />;
        })}
      </>
    );
  } else if (expr === "strain" || expr === "determined") {
    mouth = (
      <>
        <mesh geometry={box} material={BLACK} position={[0, my, z]} scale={[0.3, 0.13, 1]} />
        <mesh geometry={box} material={mat("#ffffff")} position={[0, my, z + 0.002]} scale={[0.26, 0.09, 1]} />
        {[-0.07, 0, 0.07].map((x) => (
          <mesh key={x} geometry={box} material={BLACK} position={[x, my, z + 0.004]} scale={[0.015, 0.09, 1]} />
        ))}
      </>
    );
  } else if (expr === "worried") {
    mouth = (
      <>
        {Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI * 0.2 + (i / 6) * Math.PI * 0.6;
          return <Dot key={i} p={[Math.cos(a) * 0.13, my - 0.12 + Math.sin(a) * 0.13]} r={0.022} z={z} />;
        })}
      </>
    );
  } else {
    mouth = <mesh geometry={box} material={BLACK} position={[0, my, z]} scale={[0.16, 0.04, 1]} />;
  }
  return (
    <>
      {eyes.map((p, i) =>
        blink ? (
          <mesh key={i} geometry={box} material={BLACK} position={[p[0], p[1], z]} scale={[0.13, 0.03, 1]} />
        ) : big ? (
          <group key={i}>
            <Dot p={p} r={eyeR + 0.025} z={z} />
            <Dot p={p} r={eyeR} z={z + 0.001} m={mat("#ffffff")} />
            <Dot p={[p[0] + lx, p[1] + ly]} r={0.04} z={z + 0.002} />
          </group>
        ) : (
          <Dot key={i} p={[p[0] + lx, p[1] + ly]} r={eyeR} sy={1.25} z={z} />
        ),
      )}
      {brow(-1)}
      {brow(1)}
      {mouth}
    </>
  );
};

export const Figure: React.FC<FigureProps> = ({
  expr = "neutral",
  mouthOpen = 0,
  look = [0, 0],
  armL = [0.25, 0.2],
  armR = [-0.25, -0.2],
  legL = [0.12, 0],
  legR = [-0.12, 0],
  shirt = "#2f6fdb",
  skin = "#fbf6ee",
  hair = "none",
  blink = false,
  sweat = 0,
  showBody = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const torso = useMemo(() => roundedRect(0.78, 1.0, 0.2), []);
  const torsoOutline = useMemo(() => roundedRect(0.9, 1.12, 0.25), []);
  const headY = 0.95;
  const shoulderY = 0.25;
  const L = limb([-0.36, shoulderY], armL, 0.48, 0.45);
  const R = limb([0.36, shoulderY], armR, 0.48, 0.45);
  const LL = limb([-0.17, -0.48], legL, 0.6, 0.6);
  const LR = limb([0.17, -0.48], legR, 0.6, 0.6);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {showBody && (
        <>
          {/* legs */}
          <Line a={[-0.17, -0.45]} b={LL.e} />
          <Line a={LL.e} b={LL.h} />
          <Line a={[0.17, -0.45]} b={LR.e} />
          <Line a={LR.e} b={LR.h} />
          <Dot p={[LL.h[0] - 0.05, LL.h[1]]} r={0.07} sx={1.5} />
          <Dot p={[LR.h[0] + 0.05, LR.h[1]]} r={0.07} sx={1.5} />
          {/* torso */}
          <mesh geometry={torsoOutline} material={BLACK} position={[0, 0, 0.005]} />
          <mesh geometry={torso} material={mat(shirt)} position={[0, 0, 0.01]} />
          {/* arms (in front of torso) */}
          <Line a={[-0.36, shoulderY]} b={L.e} z={0.05} />
          <Line a={L.e} b={L.h} z={0.05} />
          <Dot p={L.h} r={0.085} z={0.051} />
          <Line a={[0.36, shoulderY]} b={R.e} z={0.05} />
          <Line a={R.e} b={R.h} z={0.05} />
          <Dot p={R.h} r={0.085} z={0.051} />
        </>
      )}
      {/* head */}
      <group position={[0, headY, 0.06]}>
        <Dot p={[0, 0]} r={0.56} />
        <Dot p={[0, 0]} r={0.5} z={0.01} m={mat(skin)} />
        {hair === "kid" && (
          <>
            <Dot p={[-0.5, 0.25]} r={0.15} z={-0.005} m={mat("#7a4a26")} />
            <Dot p={[0.5, 0.25]} r={0.15} z={-0.005} m={mat("#7a4a26")} />
            <Dot p={[0, 0.42]} r={0.3} sy={0.45} z={0.02} m={mat("#7a4a26")} />
          </>
        )}
        {hair === "tuft" && <Dot p={[0.05, 0.5]} r={0.25} sy={0.4} z={0.02} m={mat("#3a2a1e")} />}
        <Face expr={expr} mouthOpen={mouthOpen} look={look} blink={blink} />
        {sweat > 0.01 && (
          <group position={[0.45, 0.25, 0.05]} scale={sweat}>
            <Dot p={[0, 0]} r={0.08} sy={1.3} m={mat("#7fd3ff")} />
            <Dot p={[0, 0.1]} r={0.04} m={mat("#7fd3ff")} />
          </group>
        )}
      </group>
    </group>
  );
};

/** 2-bone IK in figure-local units. Returns [shoulder, elbow] angles reaching from shoulder to target. */
export const ik = (shoulder: [number, number], target: [number, number], bend = 1, l1 = 0.48, l2 = 0.45): [number, number] => {
  const dx = target[0] - shoulder[0];
  const dy = target[1] - shoulder[1];
  const D = Math.min(l1 + l2 - 1e-3, Math.max(0.05, Math.hypot(dx, dy)));
  const th = Math.atan2(dx, -dy);
  const b = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))));
  const c = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2))));
  return [th + bend * b, -bend * (Math.PI - c)];
};
export const SHOULDER_L: [number, number] = [-0.36, 0.25];
export const SHOULDER_R: [number, number] = [0.36, 0.25];
