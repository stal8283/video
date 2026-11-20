// SetDemo: each ready set with a character, in its suggested light. Render these before building a scene so you know
// the baseline: SetRoom, SetClassroom, SetForest, SetOldTown (vertical 1080×1920, one frame).
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CAST } from "../engine/char/cast";
import { Character3D, headOf } from "../engine/char/Character3D";
import type { CharacterSpec } from "../engine/char/Character3D";
import { EXPRESSIONS } from "../engine/core/anim";
import { CastLight } from "../engine/core/castLight";
import { useFonts } from "../engine/core/frame";
import { moodOf } from "../engine/core/moods";
import { aim } from "../engine/core/rig";
import { View } from "../engine/core/View";
import { Leaves, Snow } from "../engine/fx/particles";
import { Classroom, Forest, OldTown, Room } from "../engine/sets/sets";
import type { V3 } from "../engine/types";

type Kind = "room" | "classroom" | "forest" | "oldtown";
const SETUP: Record<Kind, { mood: string; who: CharacterSpec; at: V3; yaw: number; cam: V3; fov: number; sky: boolean; expr: keyof typeof EXPRESSIONS; gesture: "open" | "point" | "relaxed" | "thumbsUp" }> = {
  room: { mood: "lamp", who: CAST.woman, at: [0.9, 0, 0.4], yaw: -0.5, cam: [-0.3, 1.45, 3.4], fov: 46, sky: false, expr: "happy", gesture: "open" },
  classroom: { mood: "day", who: CAST.scholar, at: [-1.5, 0, -2.4], yaw: 0.55, cam: [0.3, 1.7, 2.4], fov: 52, sky: false, expr: "talking", gesture: "point" },
  forest: { mood: "golden", who: CAST.kid, at: [0.3, 0, 0.2], yaw: 0.35, cam: [-0.6, 1.1, 3.2], fov: 50, sky: true, expr: "excited", gesture: "open" },
  oldtown: { mood: "golden", who: CAST.worker, at: [0.2, 0, -1.2], yaw: 0.1, cam: [0.8, 1.4, 2.8], fov: 50, sky: true, expr: "determined", gesture: "fist" as never },
};

export const SetDemo: React.FC<{ kind: Kind; fx?: "none" | "snow" | "leaves" }> = ({ kind, fx = "none" }) => {
  const ready = useFonts();
  const f = useCurrentFrame();
  if (!ready) return <AbsoluteFill style={{ background: "#1a1220" }} />;
  const t = 1 + f / 30;
  const S = SETUP[kind];
  const m = moodOf(S.mood);
  const head = headOf(S.at, S.who.height, S.who.build);
  const target: V3 = kind === "classroom" ? [head[0] + 0.9, head[1], head[2]] : head; // keep the board's tag in frame
  const cam = aim(S.cam, target, S.fov, 0.38);
  const camPrev = cam;
  return (
    <AbsoluteFill style={{ background: "#1a1220" }}>
      <View mood={m} cam={cam} camPrev={camPrev} t={t} focus={head} blur={1.4} sky={S.sky}>
        {kind === "room" ? <Room t={t} /> : kind === "classroom" ? <Classroom t={t} text="WHY?" /> : kind === "forest" ? <Forest t={t} season={fx === "leaves" ? "autumn" : "summer"} /> : <OldTown t={t} text="1666" night={false} />}
        <Character3D
          {...S.who}
          position={S.at}
          yaw={S.yaw}
          t={t}
          face={EXPRESSIONS[S.expr]}
          pose={{ armL: [14, 18], armR: [58, 70], armRFwd: 40, headTilt: -4 }}
          hands={{ R: S.gesture === ("fist" as never) ? "fist" : S.gesture }}
          faceCamera={cam.pos}
        />
        <CastLight at={head} cam={cam.pos} mood={m} />
        {fx === "snow" ? <Snow center={[0, 0, -2]} t={t} /> : null}
        {fx === "leaves" ? <Leaves center={[0, 0, -1]} t={t} /> : null}
      </View>
    </AbsoluteFill>
  );
};
