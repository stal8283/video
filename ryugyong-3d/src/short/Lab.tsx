// Look-development stills for the Ryugyong Short (not part of the video).
import React from "react";
import { AbsoluteFill } from "remotion";
import { useFonts } from "../engine/core/frame";
import { aim } from "../engine/core/rig";
import { View } from "../engine/core/View";
import { Boulevard, PYR_Z } from "./world/Boulevard";
import { Pyramid3D } from "./world/Pyramid3D";
import type { PyrState } from "./world/Pyramid3D";

export const Lab: React.FC<{ mood: string; state: PyrState; ledOn: number; from: [number, number, number]; at: [number, number, number]; fov: number; face: number; t: number }> = ({ mood, state, ledOn, from, at, fov, face, t }) => {
  const ready = useFonts();
  if (!ready) return <AbsoluteFill style={{ background: "#111" }} />;
  const cam = aim(from, at, fov, face);
  return (
    <AbsoluteFill>
      <View mood={mood} cam={cam} t={t} focus={at} blur={0.8} look="ink">
        <Boulevard era={mood === "night" ? "night" : mood === "cold" ? "cold" : "day"} lamps={mood === "night" ? 1 : 0} />
        <group position={[0, 0, PYR_Z]}><Pyramid3D H={135} state={state} t={t} ledOn={ledOn} crane={state === "concrete"} craneStencil="1992" /></group>
      </View>
    </AbsoluteFill>
  );
};
