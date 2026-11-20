// Gestures: a close look at the finger hands (a lookdev check, landscape).
import React from "react";
import { AbsoluteFill } from "remotion";
import { CAST } from "../engine/char/cast";
import { Character3D, headOf } from "../engine/char/Character3D";
import type { Gesture } from "../engine/char/hands";
import { CastLight } from "../engine/core/castLight";
import { moodOf } from "../engine/core/moods";
import { aim } from "../engine/core/rig";
import { View } from "../engine/core/View";
import type { V3 } from "../engine/types";

const ROWS: [Gesture, Gesture][] = [["open", "point"], ["fist", "thumbsUp"], ["count2", "count3"]];
export const Gestures: React.FC = () => {
  const m = moodOf("day");
  const A = CAST.adult;
  const ps: V3[] = [[-1.1, 0, 0], [0, 0, 0], [1.1, 0, 0]];
  const cam = aim([0, 1.3, 2.2], [0, 1.3, 0], 38, 0.5);
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} t={1} focus={[0, 1.2, 0]} blur={0} sky={false} width={1920} height={1080}>
        <mesh position={[0, 1.5, -2]}><planeGeometry args={[12, 6]} /><meshToonMaterial color="#c8d0e0" /></mesh>
        {ps.map((p, i) => (
          <Character3D key={i} {...A} position={p} yaw={0} t={1 + i} face={{ eyes: "open", mouth: "smile", brows: "raised" }}
            pose={{ armL: [40, 95], armR: [40, 95], armLFwd: 70, armRFwd: 70 }} hands={{ L: ROWS[i][0], R: ROWS[i][1] }} faceCamera={cam.pos} />
        ))}
        <CastLight at={headOf(ps[1], A.height, A.build)} cam={cam.pos} mood={m} />
      </View>
    </AbsoluteFill>
  );
};
