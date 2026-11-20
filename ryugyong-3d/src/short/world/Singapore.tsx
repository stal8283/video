// Singapore, 1986, golden hour: a plaza, the round tower (then the world's tallest hotel), an entrance canopy, palms,
// planters, flags on poles, lamp posts, a taxi stand, and a banner on two poles (the tag: TALLEST HOTEL 1986).
import React from "react";
import { boxG, canvasTex, coreMat, cylG, Label, M, sphG } from "../../engine/core/kit";
import { mapToon } from "../../engine/mat/materials";
import type { V3 } from "../../engine/types";

export const TOWER_Z = -34;
export const TOWER_H = 72;

const towerMat = () => mapToon("sg-tower", canvasTex("sg-tower", 256, 256, (g, w, h) => {
  g.fillStyle = "#cdbca8"; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 8; r++) { g.fillStyle = "#4e4458"; g.fillRect(0, r * (h / 8) + 10, w, h / 8 - 18); g.fillStyle = "#6a6074"; for (let c = 0; c < 8; c++) g.fillRect(c * (w / 8), r * (h / 8) + 10, 3, h / 8 - 18); }
}));

const Palm: React.FC<{ p: V3; s?: number; t: number; seed: number }> = ({ p, s = 1, t, seed }) => (
  <group position={p} scale={s}>
    {[0, 1, 2, 3, 4].map((k) => <M key={k} g={cylG(0.16 - k * 0.012, 0.18 - k * 0.012, 1.1, 10)} c="#8a5a32" tex="wood" p={[Math.sin(k * 0.3) * 0.08 * k, 0.55 + k * 1.05, 0]} r={[0, 0, 0.03 * k]} />)}
    {Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + seed;
      const sway = Math.sin(t * 1.2 + i + seed) * 0.05; // ≤ 2 Hz
      return (
        <group key={i} position={[0.3, 5.3, 0]} rotation={[0, a, -0.5 - sway]}>
          <M g={boxG(2.2, 0.05, 0.42)} c={i % 2 ? "#3e7a3a" : "#4e8a40"} tex="fabric" p={[1.05, -0.2, 0]} r={[0, 0, -0.25]} />
        </group>
      );
    })}
    <M g={sphG(0.28, 12)} c="#6a4a2a" p={[0.3, 5.25, 0]} />
  </group>
);
const FlagPole: React.FC<{ p: V3; color: string; t: number }> = ({ p, color, t }) => (
  <group position={p}>
    <M g={cylG(0.05, 0.06, 7, 10)} c="#d8d2c4" tex="metal" p={[0, 3.5, 0]} />
    <M g={boxG(1.4, 0.8, 0.02)} c={color} tex="fabric" p={[0.72, 6.5, 0]} r={[0, Math.sin(t * 1.5) * 0.12, 0]} />
  </group>
);
const Lamp: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={cylG(0.06, 0.08, 3.6, 12)} c="#2a3238" tex="metal" p={[0, 1.8, 0]} />
    <mesh geometry={sphG(0.18, 14)} material={coreMat("#ffe8b0", 0.85)} position={[0, 3.75, 0]} userData={{ outline: false }} />
  </group>
);

export const Singapore: React.FC<{ t: number; bannerIn: number; children?: React.ReactNode }> = ({ t, bannerIn, children }) => (
  <group>
    <M g={boxG(300, 0.2, 300)} c="#9a8070" tex="stone" ts={2} p={[0, -0.1, -80]} cast={false} />
    <M g={boxG(40, 0.12, 40)} c="#d8c4a8" tex="stone" p={[0, 0.06, -12]} cast={false} />
    {/* red carpet to the door */}
    <M g={boxG(2.2, 0.02, 20)} c="#b03a32" tex="fabric" p={[0, 0.13, -19]} cast={false} />
    {/* the tower */}
    <group position={[0, 0, TOWER_Z]}>
      <mesh geometry={cylG(9, 9, TOWER_H, 40)} material={towerMat()} position={[0, TOWER_H / 2, 0]} castShadow receiveShadow />
      <M g={cylG(9.3, 9.3, 1.2, 40)} c="#b8a48e" tex="stone" p={[0, TOWER_H + 0.6, 0]} />
      <M g={cylG(3, 3, 3, 24)} c="#b8a48e" tex="stone" p={[0, TOWER_H + 2.7, 0]} />
      <M g={boxG(26, 9, 14)} c="#d8c8b0" tex="plaster" p={[0, 4.5, 6]} />
      {/* entrance canopy and a lit lobby */}
      <M g={boxG(9, 0.5, 4.5)} c="#6e4726" tex="wood" p={[0, 4.6, 15.3]} />
      {[-4, 4].map((x) => <M key={x} g={cylG(0.15, 0.15, 4.4, 10)} c="#c99f4b" tex="metal" p={[x, 2.2, 17.2]} />)}
      <mesh position={[0, 2.2, 13.02]} material={coreMat("#ffd890", 0.95)} userData={{ outline: false }}><boxGeometry args={[6, 3.6, 0.04]} /></mesh>
      <Label text="HOTEL" p={[0, 5.3, 17.56]} w={3.4} h={0.8} fg="#2b2216" bg="#f4ead6" font={0.6} />
    </group>
    <Palm p={[-6.5, 0.12, -9]} t={t} seed={1} />
    <Palm p={[6.8, 0.12, -11]} t={t} seed={2} s={1.1} />
    <Palm p={[-9.5, 0.12, -3]} t={t} seed={3} s={0.9} />
    {[-10, -7, 7, 10].map((x, i) => <FlagPole key={x} p={[x, 0.12, -16]} color={["#c33631", "#f4ead6", "#2f5da8", "#c99f4b"][i]} t={t + i} />)}
    <Lamp p={[-3.5, 0.12, -6]} />
    <Lamp p={[3.5, 0.12, -6]} />
    {[-4.5, 4.5].map((x) => (
      <group key={x} position={[x, 0.12, -2.5]}>
        <M g={boxG(1.3, 0.55, 1.3)} c="#a85a3a" tex="brick" p={[0, 0.27, 0]} />
        {[-0.3, 0.3].map((dx) => <M key={dx} g={sphG(0.35, 12)} c="#d86a8a" p={[dx, 0.75, 0]} />)}
      </group>
    ))}
    {/* the banner on two poles (the tag) */}
    {[-2.6, 2.6].map((x) => <M key={x} g={cylG(0.06, 0.07, 3.6, 10)} c="#2a3238" tex="metal" p={[x, 1.8 + 0.12, -4]} />)}
    <group position={[0, 3.0 + (1 - bannerIn) * 1.4, -4]} visible={bannerIn > 0}>
      <M g={boxG(5.0, 0.8, 0.03)} c="#c33631" tex="fabric" />
      <Label text="TALLEST HOTEL 1986" p={[0, 0, 0.02]} w={4.7} h={0.62} fg="#f4f1ea" bg="none" font={0.62} />
    </group>
    {children}
  </group>
);
