// Ready sets for stories, facts and history. Each is dressed in three depth layers (foreground props near the lens,
// the character's ground, the background wall or skyline) with ≥ 12 props, every surface painted, ONE key practical.
// The open side of an interior faces +z (put the camera at z > 0 and keep it inside the room: x within ±(w/2 − 0.3),
// y below the ceiling). Use <View sky={false}> indoors and a "lamp", "cold" or "day" mood.
//
//   <Room t />          a cozy home: sofa, rug, bookshelf, window with a light beam, lamp, plants (stories, daily life)
//   <Classroom t text/> desks, chalkboard with a tag, globe, bookshelf, clock (facts, explainers, school)
//   <Forest t />        a clearing: trees, pines, bushes, rocks, logs, mushrooms, grass (nature, adventure, fables)
//   <OldTown t text/>   stone houses, columns, a well, a cart, torches, a banner (history: any era before ~1900)
//   (the original <Street> lives in src/demo/Street.tsx: a modern street corner)
//
// Every set takes `t` (for flames and motion) and a few switches. Characters stand at y = 0 unless noted.
import React from "react";
import { boxG, M } from "../core/kit";
import { Dust, LightBeam } from "../fx/particles";
import type { V3 } from "../types";
import {
  Amphora, Banner, Barrel, Bed, Bookshelf, BookStack, Bush, Candle, Cart, Chair, Chalkboard, Clock, Column, Crate, Desk, DeskLamp,
  Door, FloorLamp, Frame, Globe, Grass, Log, Mug, Mushroom, PineTree, Plant, Rock, Rug, Sofa, StoneHouse, Stump, Table, TorchStand,
  Tree, Well, WallWindow,
} from "./props";

/** walls, floor and ceiling of a box room; open toward +z. Walls start 2 cm apart so no two faces are coplanar. */
export const RoomShell: React.FC<{ w?: number; d?: number; hgt?: number; wall?: string; floor?: string; trim?: string; ceiling?: boolean }> = ({ w = 7, d = 6, hgt = 3, wall = "#e8c8a0", floor = "#a8743e", trim = "#f4ead8", ceiling = true }) => (
  <group>
    <M g={boxG(w + 2, 0.1, d + 4)} c={floor} tex="planks" p={[0, -0.05, 1]} cast={false} />
    <M g={boxG(w, hgt, 0.12)} c={wall} tex="plaster" p={[0, hgt / 2, -d / 2 - 0.06]} />
    <M g={boxG(0.12, hgt, d + 3)} c={wall} tex="plaster" p={[-w / 2 - 0.08, hgt / 2, 1.5 - 0.02]} />
    <M g={boxG(0.12, hgt, d + 3)} c={wall} tex="plaster" p={[w / 2 + 0.08, hgt / 2, 1.5 - 0.02]} />
    {/* skirting boards, a hair proud of the walls */}
    <M g={boxG(w, 0.12, 0.03)} c={trim} p={[0, 0.06, -d / 2 + 0.015]} />
    {ceiling ? <M g={boxG(w + 0.4, 0.12, d + 4)} c="#f0e6d6" tex="plaster" p={[0, hgt + 0.06, 1]} cast={false} /> : null}
  </group>
);

export const Room: React.FC<{ t: number; lamp?: number; beam?: boolean; wall?: string }> = ({ t, lamp = 1, beam = true, wall = "#e8c8a0" }) => {
  const D = 6;
  const back = -D / 2;
  const winP: V3 = [-1.6, 1.7, back + 0.003];
  return (
    <group>
      <RoomShell w={7} d={D} wall={wall} />
      <WallWindow p={winP} w={1.2} hgt={1.3} sky="#a8d0f0" />
      <Frame p={[1.2, 1.9, back + 0.004]} w={0.7} hgt={0.5} art="#c87a5a" />
      <Frame p={[2.1, 1.75, back + 0.004]} w={0.4} hgt={0.5} art="#6a9ac8" />
      <Clock p={[0.1, 2.35, back + 0.004]} hour={4.25} />
      <Bookshelf p={[2.7, 0, back + 0.35]} w={1.1} seed={5} />
      <Sofa p={[0.2, 0, back + 0.75]} />
      <Rug p={[0.2, 0, -0.6]} w={2.6} d={1.7} />
      <Table p={[0.2, 0, -0.5]} w={1.0} d={0.6} s={0.62} color="#8a5a32" />
      <Mug p={[0.0, 0.47, -0.45]} />
      <BookStack p={[0.42, 0.47, -0.55]} n={3} seed={2} />
      <FloorLamp p={[-2.7, 0, back + 0.4]} on={lamp} />
      <Plant p={[-2.9, 0, -0.6]} />
      <Plant p={[1.8, 0, back + 0.4]} s={0.8} color="#3a8a5a" />
      <Chair p={[-1.7, 0, 0.3]} yaw={0.6} />
      <Door p={[-3.45, 0, -0.4]} yaw={Math.PI / 2} />
      {/* foreground: a low side table edge and a plant near the lens (they fall soft in the depth of field) */}
      <Plant p={[2.6, 0, 2.2]} s={0.9} />
      {beam ? (
        <>
          <LightBeam from={[winP[0], winP[1], winP[2] + 0.05]} to={[winP[0] + 1.6, 0.05, winP[2] + 2.6]} radius={0.55} radiusEnd={1.1} />
          <Dust center={[winP[0] + 0.8, 1.0, winP[2] + 1.3]} size={[1.6, 1.8, 1.8]} t={t} count={110} />
        </>
      ) : null}
    </group>
  );
};

export const Classroom: React.FC<{ t: number; text?: string }> = ({ t, text = "" }) => {
  const D = 7;
  const back = -D / 2;
  return (
    <group>
      <RoomShell w={8} d={D} wall="#cfe0d0" floor="#b8885a" />
      <Chalkboard p={[0, 0, back]} text={text} />
      <Clock p={[2.6, 2.5, back + 0.004]} hour={10.5} />
      <WallWindow p={[3.99, 1.7, -1.2]} yaw={-Math.PI / 2} w={1.4} hgt={1.4} sky="#b8dcf8" />
      <WallWindow p={[3.99, 1.7, 1.0]} yaw={-Math.PI / 2} w={1.4} hgt={1.4} sky="#b8dcf8" />
      <Bookshelf p={[-3.2, 0, back + 0.35]} w={1.1} seed={9} />
      <Desk p={[2.2, 0, back + 1.1]} yaw={Math.PI} />
      <Globe p={[1.9, 0.79, back + 1.0]} t={t} />
      <BookStack p={[2.55, 0.79, back + 1.15]} n={4} seed={4} />
      {[-1.6, 0, 1.6].flatMap((x) =>
        [0.4, 1.8].map((z) => (
          <group key={`${x}${z}`}>
            <Table p={[x, 0, z]} w={1.1} d={0.6} color="#c8945a" />
            <Chair p={[x, 0, z + 0.55]} yaw={Math.PI} />
          </group>
        )),
      )}
      <Plant p={[-3.4, 0, 2.6]} />
      <DeskLamp p={[2.75, 0.79, back + 0.95]} />
    </group>
  );
};

export const Forest: React.FC<{ t: number; season?: "summer" | "autumn" }> = ({ t: _t, season = "summer" }) => {
  const leaf = season === "autumn" ? "#d8822a" : "#4a9a3a";
  const leaf2 = season === "autumn" ? "#c8502a" : "#3a8a3a";
  return (
    <group>
      <M g={boxG(80, 0.2, 80)} c="#6aa04a" tex="grass" ts={1.5} p={[0, -0.1, 0]} cast={false} />
      {/* a dirt path through the clearing */}
      <M g={boxG(1.8, 0.02, 30)} c="#b8945a" tex="sand" p={[0.4, 0.01, -6]} r={[0, 0.12, 0]} cast={false} />
      <Tree p={[-4.2, 0, -5]} leaf={leaf} seed={1} />
      <Tree p={[4.6, 0, -6.5]} leaf={leaf2} seed={4} hgt={4.8} />
      <Tree p={[-1.2, 0, -11]} leaf={leaf} seed={7} hgt={5} />
      <PineTree p={[7.5, 0, -10]} />
      <PineTree p={[-8, 0, -9]} hgt={6} />
      <PineTree p={[2.6, 0, -15]} hgt={6.5} />
      <PineTree p={[-5, 0, -17]} hgt={7} />
      <Bush p={[-2.6, 0, -3.2]} color={leaf2} />
      <Bush p={[3.2, 0, -3.6]} s={0.8} />
      <Rock p={[2.2, 0, -2.2]} seed={2} />
      <Rock p={[-3.6, 0, -1.4]} seed={5} s={0.7} />
      <Log p={[-1.8, 0, -1.6]} yaw={0.4} />
      <Stump p={[2.8, 0, -0.6]} />
      <Mushroom p={[-1.0, 0, -1.2]} />
      <Mushroom p={[-0.8, 0, -1.4]} s={0.7} />
      <Grass p={[0, 0, -2]} w={9} d={6} n={60} />
      {/* foreground near the lens */}
      <Bush p={[-2.2, 0, 3.0]} s={0.7} />
      <Rock p={[2.4, 0, 3.2]} seed={8} s={0.6} />
    </group>
  );
};

export const OldTown: React.FC<{ t: number; text?: string; night?: boolean }> = ({ t, text = "", night = false }) => (
  <group>
    <M g={boxG(70, 0.2, 70)} c="#a89a88" tex="stone" ts={1.5} p={[0, -0.1, 0]} cast={false} />
    <StoneHouse p={[-4.8, 0, -8]} w={5} hgt={4.6} lit={night} />
    <StoneHouse p={[1.0, 0, -9]} w={5.4} hgt={5.4} wall="#d8c8a8" roof="#7a3a32" lit={night} />
    <StoneHouse p={[7.2, 0, -7.6]} w={4.6} hgt={4.2} wall="#bca88a" roof="#9a5a3a" />
    <Column p={[-2.3, 0, -4.4]} />
    <Column p={[2.6, 0, -4.4]} />
    <Banner p={[0.15, 3.8, -4.42]} text={text} w={1.2} />
    <Well p={[-3.6, 0, -2.4]} s={0.9} />
    <Cart p={[3.4, 0, -2.4]} yaw={-0.4} />
    <TorchStand p={[-1.6, 0, -2.6]} t={t} on={night ? 1 : 0.4} />
    <TorchStand p={[1.9, 0, -2.6]} t={t + 0.7} on={night ? 1 : 0.4} />
    <Barrel p={[5.0, 0, -4.2]} />
    <Crate p={[5.6, 0, -3.6]} yaw={0.3} />
    <Amphora p={[-5.4, 0, -4.6]} />
    <Amphora p={[-5.0, 0, -4.2]} s={0.8} color="#b85a2a" />
    {/* foreground near the lens */}
    <Crate p={[2.6, 0, 2.6]} yaw={0.5} s={0.8} />
    <Amphora p={[-2.4, 0, 2.8]} s={0.9} />
  </group>
);

// small things scenes often want, re-exported for convenience
export { Bed, Candle, Desk, Table, Chair };
