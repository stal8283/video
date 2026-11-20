import React from "react";
import { Composition } from "remotion";
import { Lab } from "./short/Lab";
import { Demo, DEMO_MOODS } from "./demo/Demo";
import { DemoCast } from "./demo/DemoCast";
import { DemoMove, MOVE_FRAMES } from "./demo/DemoMove";
import { SUB } from "./engine/core/frame";
import { Gestures } from "./demo/Gestures";
import { SetDemo } from "./demo/SetDemo";
import { Short } from "./short/Short";
import { DURATION } from "./plan.gen";

// DemoHero: a low hero framing with foreground props. Demo: one still. Demo-<mood>: the same frame in each act light. DemoWide: the whole set.
// DemoCast: the three example characters in a row (a landscape family sheet).
// DemoMove: a 3 s beat-rig move (sharp). DemoMoveSub: the same at SUB × fps for motion blur (average with ffmpeg tmix).
export const Root: React.FC = () => (
  <>
    <Composition id="Short" component={Short} durationInFrames={DURATION} fps={30} width={1080} height={1920} defaultProps={{ sub: false }} />
    <Composition id="ShortSub" component={Short} durationInFrames={DURATION * SUB} fps={30 * SUB} width={1080} height={1920} defaultProps={{ sub: true }} />
    <Composition id="Lab" component={Lab} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ mood: "night", state: "lit" as const, ledOn: 1, from: [1.5, 1.0, 9] as [number, number, number], at: [0, 40, -170] as [number, number, number], fov: 70, face: 0.35, t: 1 }} />
    <Composition id="Demo" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "day", wide: false }} />
    <Composition id="DemoHero" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "dusk", wide: false, hero: true }} />
    <Composition id="DemoWide" component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: "day", wide: true }} />
    {DEMO_MOODS.map((m) => (
      <Composition key={m} id={`Demo-${m}`} component={Demo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ mood: m, wide: false }} />
    ))}
    <Composition id="DemoCast" component={DemoCast} durationInFrames={30} fps={30} width={1920} height={1080} defaultProps={{ mood: "day" }} />
    <Composition id="DemoMove" component={DemoMove} durationInFrames={MOVE_FRAMES} fps={30} width={1080} height={1920} defaultProps={{ sub: false }} />
    <Composition id="DemoMoveSub" component={DemoMove} durationInFrames={MOVE_FRAMES * SUB} fps={30 * SUB} width={1080} height={1920} defaultProps={{ sub: true }} />
    <Composition id="SetRoom" component={SetDemo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ kind: "room" as const }} />
    <Composition id="SetClassroom" component={SetDemo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ kind: "classroom" as const }} />
    <Composition id="SetForest" component={SetDemo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ kind: "forest" as const, fx: "leaves" as const }} />
    <Composition id="SetOldTown" component={SetDemo} durationInFrames={30} fps={30} width={1080} height={1920} defaultProps={{ kind: "oldtown" as const }} />
    <Composition id="Gestures" component={Gestures} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
);
