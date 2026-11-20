// The architect's table (golden close-ups for the explanation beats): a blueprint that unrolls with a red pencil
// circle, two scale models (Singapore's drum and the growing pyramid), the wrapped present that opens empty,
// and dense desk clutter: lamp, mug with steam, books, ruler, pencils, compass, globe, pinned drawings.
import React from "react";
import { boxG, canvasTex, cylG, Label, M, sphG } from "../../engine/core/kit";
import { mapToon } from "../../engine/mat/materials";
import { RoomShell } from "../../engine/sets/sets";
import { BookStack, Bookshelf, DeskLamp, Frame, Globe, Mug, Plant, WallWindow } from "../../engine/sets/props";
import { Dust, LightBeam, Steam } from "../../engine/fx/particles";
import type { V3 } from "../../engine/types";
import { Pyramid3D } from "./Pyramid3D";

export const TOP = 0.8; // table top height
const blueprint = (circle: number) => {
  const k = Math.round(circle * 12);
  return mapToon(`bp-${k}`, canvasTex(`bp-${k}`, 512, 384, (g, w, h) => {
    g.fillStyle = "#2e5c86"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#4a7aa6"; g.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.strokeStyle = "#dce8f2"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w * 0.3, h * 0.92); g.lineTo(w * 0.47, h * 0.18); g.lineTo(w * 0.53, h * 0.18); g.lineTo(w * 0.7, h * 0.92); g.closePath(); g.stroke();
    for (let i = 1; i < 9; i++) { const y = h * (0.92 - i * 0.082), hw = w * (0.2 - i * 0.02); g.beginPath(); g.moveTo(w / 2 - hw, y); g.lineTo(w / 2 + hw, y); g.stroke(); }
    g.beginPath(); g.moveTo(w * 0.48, h * 0.18); g.lineTo(w * 0.49, h * 0.06); g.lineTo(w * 0.51, h * 0.06); g.lineTo(w * 0.52, h * 0.18); g.stroke();
    g.fillStyle = "#dce8f2"; g.font = "800 30px Poppins"; g.fillText("105 FLOORS", 18, 40);
    g.font = "700 18px Poppins"; g.fillText("PYONGYANG - 1987", w - 200, h - 16);
    if (k > 0) { // the red pencil circle drawn around the (empty) interior
      g.strokeStyle = "#c33631"; g.lineWidth = 7; g.lineCap = "round";
      g.beginPath(); g.ellipse(w / 2, h * 0.58, w * 0.16, h * 0.3, 0, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * k) / 12); g.stroke();
    }
  }));
};
const giftPaper = () => mapToon("gift-paper", canvasTex("gift-paper", 256, 256, (g, w, h) => {
  g.fillStyle = "#6f8f9e"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#dce8ec"; g.lineWidth = 4;
  for (let i = -1; i < 5; i++) { g.beginPath(); g.moveTo(i * 64, h); g.lineTo(i * 64 + 32, h * 0.55); g.lineTo(i * 64 + 64, h); g.stroke(); g.beginPath(); g.moveTo(i * 64, h * 0.5); g.lineTo(i * 64 + 32, h * 0.05); g.lineTo(i * 64 + 64, h * 0.5); g.stroke(); }
}));

const Ruler: React.FC<{ p: V3; yaw: number }> = ({ p, yaw }) => (
  <group position={p} rotation={[0, yaw, 0]}>
    <M g={boxG(0.5, 0.008, 0.05)} c="#d9c67a" tex="wood" />
    {Array.from({ length: 10 }, (_, i) => <M key={i} g={boxG(0.004, 0.0085, 0.015)} c="#3a2a1a" p={[-0.22 + i * 0.049, 0, -0.016]} cast={false} />)}
  </group>
);
const Pencil: React.FC<{ p: V3; yaw: number; c: string }> = ({ p, yaw, c }) => (
  <group position={p} rotation={[0, yaw, Math.PI / 2]}>
    <M g={cylG(0.007, 0.007, 0.18, 8)} c={c} />
    <M g={cylG(0.0, 0.007, 0.025, 8)} c="#e7c9a0" p={[0, 0.1, 0]} />
  </group>
);

export const Table: React.FC<{
  t: number;
  /** S04: blueprint unroll 0..1 and red circle 0..1 */ unroll?: number; circle?: number;
  /** S06: the pyramid model grows 0..1 next to the Singapore model */ grow?: number; models?: boolean;
  /** S10: the present: glint 0..1, lid 0..1, moth 0..1 */ gift?: { glint: number; lid: number; moth: number } | null;
}> = ({ t, unroll = 1, circle = 0, grow = 0, models = false, gift = null }) => {
  const winP: V3 = [-1.4, 1.8, -2.0 + 0.003];
  const L = gift ? Math.min(1, gift.lid) : 0;
  const le = 1 - Math.pow(1 - L, 3);
  return (
    <group>
      <RoomShell w={5} d={4} hgt={3} wall="#d8b88a" floor="#7a4a2a" trim="#efe6d2" />
      <WallWindow p={winP} w={1.2} hgt={1.4} sky="#ffc888" />
      <LightBeam from={[winP[0], winP[1], winP[2] + 0.05]} to={[0.1, TOP, 0.0]} radius={0.5} radiusEnd={0.9} />
      <Dust center={[-0.6, 1.4, -0.8]} size={[1.6, 1.4, 1.6]} t={t} count={70} />
      <Bookshelf p={[1.6, 0, -1.75]} w={1.2} seed={7} />
      <Frame p={[0.3, 1.9, -1.99]} w={0.6} hgt={0.45} art="#2e5c86" />
      <Frame p={[0.95, 1.75, -1.99]} w={0.35} hgt={0.45} art="#c87a5a" />
      <Plant p={[-2.0, 0, -1.5]} />
      {/* the table */}
      <M g={boxG(2.2, 0.06, 1.2)} c="#a8723e" tex="wood" p={[0, TOP - 0.03, 0]} />
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <M key={`${x}${z}`} g={boxG(0.07, TOP - 0.06, 0.07)} c="#a8723e" tex="wood" p={[x * 1.0, (TOP - 0.06) / 2, z * 0.5]} />))}
      <DeskLamp p={[0.85, TOP, -0.4]} yaw={-0.6} />
      <Mug p={[-0.8, TOP, 0.25]} />
      <Steam at={[-0.8, TOP + 0.13, 0.25]} t={t} count={8} rise={0.22} />
      <BookStack p={[0.85, TOP, 0.3]} n={3} seed={4} />
      <Globe p={[-0.85, TOP, -0.35]} s={0.55} t={t} />
      <Ruler p={[0.35, TOP + 0.005, 0.42]} yaw={0.2} />
      <Pencil p={[-0.45, TOP + 0.008, 0.38]} yaw={-0.4} c="#c33631" />
      <Pencil p={[-0.35, TOP + 0.008, 0.45]} yaw={0.3} c="#3d5fbf" />
      {/* the blueprint, unrolling to the right from a roll */}
      {!models && !gift ? (
        <group position={[-0.55, TOP + 0.004, 0.0]}>
          <mesh position={[0.55 * Math.max(0.02, unroll), 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[Math.max(0.02, unroll), 1, 1]} material={blueprint(circle)} receiveShadow userData={{ outline: false }}>
            <planeGeometry args={[1.1, 0.82]} />
          </mesh>
          <M g={cylG(0.035, 0.035, 0.84, 14)} c="#3a6e9a" p={[1.1 * unroll, 0.035, 0]} r={[Math.PI / 2, 0, 0]} />
        </group>
      ) : null}
      {/* the two scale models */}
      {models ? (
        <group>
          <group position={[-0.3, TOP, 0]}>
            <M g={cylG(0.09, 0.09, 0.42, 24)} c="#cdbca8" tex="plaster" p={[0, 0.21, 0]} />
            {[0.08, 0.16, 0.24, 0.32].map((y) => <M key={y} g={cylG(0.092, 0.092, 0.02, 24)} c="#4e4458" p={[0, y, 0]} />)}
            <Label text="SINGAPORE" p={[0, 0.02, 0.13]} r={[-0.4, 0, 0]} w={0.22} h={0.05} fg="#1a1416" bg="#f4ead6" font={0.7} />
          </group>
          <group position={[0.3, TOP, 0]} scale={[1, Math.max(0.001, grow), 1]}>
            <Pyramid3D H={0.66} state="concrete" />
          </group>
          <Label text="PYONGYANG" p={[0.3, TOP + 0.02, 0.2]} r={[-0.4, 0, 0]} w={0.24} h={0.05} fg="#1a1416" bg="#f4ead6" font={0.7} />
        </group>
      ) : null}
      {/* the wrapped present */}
      {gift ? (
        <group position={[0, TOP, 0]}>
          <mesh position={[0, 0.2, 0]} material={giftPaper()} castShadow receiveShadow><boxGeometry args={[0.5, 0.4, 0.4]} /></mesh>
          <M g={boxG(0.07, 0.402, 0.402)} c="#c99f4b" p={[0, 0.2, 0]} />
          <M g={boxG(0.502, 0.402, 0.07)} c="#c99f4b" p={[0, 0.2, 0]} />
          {/* the dark, empty inside (visible once the lid lifts) */}
          <M g={boxG(0.46, 0.005, 0.36)} c="#1a1e24" p={[0, 0.396, 0]} cast={false} />
          {/* glint sweep across the paper */}
          {gift.glint > 0 && gift.glint < 1 ? (
            <mesh position={[-0.3 + gift.glint * 0.6, 0.2, 0.202]} rotation={[0, 0, 0.4]} userData={{ outline: false }}>
              <planeGeometry args={[0.05, 0.5]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
            </mesh>
          ) : null}
          <group position={[0.02 * le, 0.42 + le * 0.38, -0.05 * le]} rotation={[-0.5 * le, 0, 0.25 * le]}>
            <mesh material={giftPaper()} castShadow><boxGeometry args={[0.52, 0.06, 0.42]} /></mesh>
            <M g={boxG(0.07, 0.062, 0.422)} c="#c99f4b" />
            <M g={sphG(0.06, 12)} c="#c99f4b" p={[0, 0.06, 0]} s={[1.6, 0.8, 1]} />
          </group>
          <Label text="105 FL." p={[0.27, 0.12, 0.12]} r={[0, 0.5, 0]} w={0.12} h={0.06} fg="#1a1416" bg="#f4ead6" font={0.7} />
          {gift.moth > 0 && gift.moth < 1 ? (() => {
            const m = gift.moth;
            const flap = Math.sin(t * Math.PI * 2 * 2) * 0.7; // 2 Hz: no strobing
            return (
              <group position={[0.25 * m + Math.sin(m * 9) * 0.05, 0.42 + m * 0.55, 0.1 * m]}>
                <M g={boxG(0.035, 0.004, 0.025)} c="#bdb6a6" p={[-0.02, 0, 0]} r={[0, 0, flap]} />
                <M g={boxG(0.035, 0.004, 0.025)} c="#bdb6a6" p={[0.02, 0, 0]} r={[0, 0, -flap]} />
                <M g={boxG(0.008, 0.008, 0.03)} c="#3a2a1a" />
              </group>
            );
          })() : null}
        </group>
      ) : null}
    </group>
  );
};
