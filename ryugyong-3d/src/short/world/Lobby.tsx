// The hotel lobby: grand, dusty, never used. Open toward +z (camera at z > 0, |x| < 4.2, under the 3.6 m ceiling).
import React from "react";
import { boxG, canvasTex, coreMat, cylG, Label, M, sphG } from "../../engine/core/kit";
import { mapToon } from "../../engine/mat/materials";
import { RoomShell } from "../../engine/sets/sets";
import { Chair, Clock, Column, FloorLamp, Frame, Plant, Rug, Sofa, WallWindow } from "../../engine/sets/props";
import { Dust, LightBeam } from "../../engine/fx/particles";
import type { V3 } from "../../engine/types";

export const BACK = -3.5;
export const DESK_Z = -1.9;
export const DESK_X = 0.9;
export const BELL: V3 = [2.0, 1.08, DESK_Z + 0.1];

const keyRack = () => mapToon("keyrack", canvasTex("keyrack", 512, 320, (g, w, h) => {
  g.fillStyle = "#6e4726"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#5a3a1e"; g.fillRect(8, 8, w - 16, h - 16);
  g.fillStyle = "#f4e9c8"; g.font = "800 30px Poppins"; g.textAlign = "center"; g.fillText("ROOM KEYS", w / 2, 40);
  for (let i = 0; i < 105; i++) {
    const c = i % 15, r = Math.floor(i / 15);
    const x = 28 + c * 32, y = 66 + r * 36;
    g.fillStyle = "#1a1210"; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#c8a64b"; g.fillRect(x - 2.5, y + 2, 5, 16); g.fillRect(x - 5, y + 16, 10, 5);
  }
}));

const Elevator: React.FC<{ p: V3; floor: number }> = ({ p, floor }) => (
  <group position={p}>
    <M g={boxG(1.7, 2.7, 0.1)} c="#c99f4b" tex="metal" p={[0, 1.35, 0]} />
    <M g={boxG(0.7, 2.3, 0.06)} c="#8a9098" tex="metal" p={[-0.36, 1.15, 0.08]} />
    <M g={boxG(0.7, 2.3, 0.06)} c="#8a9098" tex="metal" p={[0.36, 1.15, 0.08]} />
    <M g={boxG(0.8, 0.42, 0.12)} c="#1a1a1a" p={[0, 2.95, 0.06]} />
    <Label text={String(Math.round(floor))} p={[0, 2.95, 0.125]} w={0.62} h={0.32} fg={floor > 1.5 ? "#ffc860" : "#7a5a2a"} bg="none" font={0.9} />
    <M g={boxG(0.08, 0.16, 0.04)} c="#d8c890" p={[0.95, 1.2, 0.07]} />
  </group>
);

/** a red banner on two strings over the desk; drop 0..1 = falling to the floor; enter 0..1 = sliding down into place */
export const Banner: React.FC<{ text: string; drop: number; enter: number }> = ({ text, drop, enter }) => {
  if (enter <= 0) return null;
  const k = Math.min(1, Math.max(0, drop));
  const y = 3.05 + (1 - enter) * 1.2 - k * k * 2.6;
  return (
    <group position={[DESK_X, y, DESK_Z - 0.55]} rotation={[k * 0.5, 0, k * 0.3]}>
      {k < 0.05 ? <><M g={boxG(0.02, 0.6, 0.02)} c="#2a2a2a" p={[-1.1, 0.55, 0]} /><M g={boxG(0.02, 0.6, 0.02)} c="#2a2a2a" p={[1.1, 0.55, 0]} /></> : null}
      <M g={boxG(2.6, 0.55, 0.03)} c="#c33631" tex="fabric" />
      <Label text={text} p={[0, 0, 0.02]} w={2.4} h={0.45} fg="#f4f1ea" bg="none" font={0.62} />
    </group>
  );
};

export const LuggageCart: React.FC<{ p: V3 }> = ({ p }) => (
  <group position={p}>
    <M g={boxG(1.0, 0.06, 0.6)} c="#c99f4b" tex="metal" p={[0, 0.3, 0]} />
    {[-0.48, 0.48].map((x) => <M key={x} g={cylG(0.025, 0.025, 1.6, 8)} c="#c99f4b" tex="metal" p={[x, 1.1, 0]} />)}
    <M g={cylG(0.025, 0.025, 1.0, 8)} c="#c99f4b" tex="metal" p={[0, 1.9, 0]} r={[0, 0, Math.PI / 2]} />
    {[-0.4, 0.4].map((x) => <M key={`w${x}`} g={cylG(0.09, 0.09, 0.05, 14)} c="#2a2a2a" p={[x, 0.09, 0.25]} r={[0, 0, Math.PI / 2]} />)}
  </group>
);

export const Lobby: React.FC<{
  t: number; day: boolean; dial?: number; calendar?: string; tear?: number;
  banner?: { text: string; drop: number; enter: number } | null; sheets?: boolean; children?: React.ReactNode;
}> = ({ t, day, dial = 1, calendar = "2026", tear = 0, banner = null, sheets = true, children }) => {
  const winP: V3 = [-3.0, 1.9, BACK + 0.003];
  return (
    <group>
      <RoomShell w={9} d={7} hgt={3.6} wall={day ? "#d8c8a8" : "#a89a80"} floor="#8a5a3a" trim="#c99f4b" />
      {/* wainscot + cornice */}
      <M g={boxG(9, 1.0, 0.04)} c="#6e4726" tex="wood" p={[0, 0.5, BACK + 0.02]} />
      <M g={boxG(9, 0.14, 0.12)} c="#c99f4b" tex="metal" p={[0, 3.45, BACK + 0.06]} />
      <WallWindow p={winP} w={1.3} hgt={1.6} sky={day ? "#a8d0f0" : "#1c2448"} lit={day ? 1 : 0.6} />
      <Label text="RYUGYONG HOTEL" p={[0.9, 3.0, BACK + 0.012]} w={2.2} h={0.32} fg="#2b2216" bg="#c99f4b" font={0.6} />
      {/* key rack: 105 hooks, 105 keys */}
      <mesh position={[0.9, 2.0, BACK + 0.03]} material={keyRack()} castShadow receiveShadow><boxGeometry args={[1.7, 1.05, 0.05]} /></mesh>
      <Clock p={[-1.3, 2.55, BACK + 0.004]} hour={day ? 10.2 : 2.0} />
      <Frame p={[-1.3, 1.65, BACK + 0.004]} w={0.55} hgt={0.7} art="#6f8f9e" />
      <Elevator p={[3.4, 0, BACK + 0.05]} floor={dial} />
      {/* wall calendar with a tearing page */}
      <group position={[-0.2, 1.75, BACK + 0.02]}>
        <M g={boxG(0.42, 0.5, 0.02)} c="#f4f1ea" tex="paper" />
        <M g={boxG(0.42, 0.12, 0.025)} c="#7a2e2a" p={[0, 0.2, 0.002]} />
        <Label text={calendar} p={[0, -0.05, 0.014]} w={0.38} h={0.22} fg="#1a1416" bg="none" font={0.8} />
        {tear > 0 && tear < 1 ? (
          <group position={[tear * 0.4, -tear * tear * 1.6, 0.06 + tear * 0.2]} rotation={[0, 0, tear * 4]}>
            <M g={boxG(0.4, 0.36, 0.01)} c="#f4f1ea" tex="paper" />
          </group>
        ) : null}
      </group>
      {/* reception desk */}
      <group position={[DESK_X, 0, DESK_Z]}>
        <M g={boxG(2.8, 1.0, 0.6)} c="#6e4726" tex="planks" p={[0, 0.5, 0]} />
        <M g={boxG(2.95, 0.07, 0.72)} c="#8a5e36" tex="wood" p={[0, 1.035, 0]} />
        <M g={boxG(2.82, 0.06, 0.02)} c="#c99f4b" tex="metal" p={[0, 0.85, 0.31]} />
        <Label text="RECEPTION" p={[0, 0.55, 0.305]} w={1.1} h={0.24} fg="#2b2216" bg="#c99f4b" font={0.6} />
      </group>
      {/* the desk bell */}
      <group position={BELL}>
        <M g={cylG(0.09, 0.09, 0.02, 18)} c="#3a3a3a" />
        <M g={sphG(0.075, 18)} c="#c99f4b" tex="metal" p={[0, 0.02, 0]} s={[1, 0.75, 1]} />
        <M g={cylG(0.008, 0.008, 0.05, 8)} c="#2a2a2a" p={[0, 0.09, 0]} />
      </group>
      {/* the guest book */}
      <M g={boxG(0.4, 0.03, 0.28)} c="#2c3e50" p={[0.1, 1.085, DESK_Z + 0.08]} r={[0, 0.2, 0]} />
      {/* grandeur: columns, chandelier, rug, the covered sofa, chairs, plants, a lamp, a luggage trolley */}
      <Column p={[-3.9, 0, -0.6]} hgt={3.6} />
      <Column p={[3.9, 0, -0.6]} hgt={3.6} />
      <group position={[0.4, 3.25, 0.4]}>
        <M g={cylG(0.01, 0.01, 0.35, 6)} c="#2a2a2a" p={[0, 0.17, 0]} />
        <M g={cylG(0.42, 0.26, 0.16, 16)} c="#c99f4b" tex="metal" />
        {[0, 1, 2, 3, 4, 5].map((i) => <mesh key={i} geometry={sphG(0.05, 10)} material={coreMat("#ffe0a0", day ? 0.6 : 1.25)} position={[Math.cos(i) * 0.38, -0.1, Math.sin(i) * 0.38]} userData={{ outline: false }} />)}
        <pointLight position={[0, -0.3, 0]} color="#ffc070" intensity={day ? 1.5 : 3.5} distance={7} decay={2} />
      </group>
      <Rug p={[0.2, 0, 0.6]} w={1.6} d={4.2} color="#8e2b28" border="#c99f4b" />
      <Sofa p={[-2.7, 0, -2.5]} color={sheets ? "#d8d2c4" : "#7a2e3a"} />
      <Chair p={[-3.6, 0, -1.4]} yaw={0.9} color={sheets ? "#d8d2c4" : "#8a5a32"} />
      <Plant p={[2.6, 0, -2.9]} s={1.2} />
      <Plant p={[-3.9, 0, 1.4]} s={1.1} color="#3a8a5a" />
      <FloorLamp p={[-3.9, 0, -3.0]} on={day ? 0.4 : 1} />
      <LuggageCart p={[3.3, 0, -1.0]} />
      {banner ? <Banner {...banner} /> : null}
      {/* the window beam with dust (calm, abandoned) */}
      <LightBeam from={[winP[0], winP[1], winP[2] + 0.05]} to={[winP[0] + 1.4, 0.05, winP[2] + 2.8]} radius={0.6} radiusEnd={1.2} strength={day ? 1 : 0.6} />
      <Dust center={[winP[0] + 0.7, 1.1, winP[2] + 1.4]} size={[1.6, 1.8, 1.8]} t={t} count={90} />
      {children}
    </group>
  );
};
