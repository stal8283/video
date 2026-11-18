import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { Captions } from "./Captions";
import { DISSOLVE, SCENE_TIMES, VO, wordFrame } from "./timing";
import { SceneId } from "./script";
import { SCENE_COMPONENTS } from "./scenes";

export type SceneProps = {
  dur: number; // frames this scene is on screen (incl. dissolve tail)
  /** local frame at which `anchor` is spoken (relative to this scene's start) */
  at: (anchor: string) => number;
};

const Fade: React.FC<{ children: React.ReactNode; first: boolean }> = ({ children, first }) => {
  const f = useCurrentFrame();
  const o = first ? 1 : interpolate(f, [0, DISSOLVE], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#05070a" }}>
    {SCENE_TIMES.map((s, i) => {
      const from = Math.max(0, s.start - (i === 0 ? 0 : DISSOLVE));
      const dur = s.end - from + DISSOLVE; // overlap into next scene's dissolve
      const Comp = SCENE_COMPONENTS[s.id as SceneId];
      const at = (anchor: string) => wordFrame(anchor, s.wordIdx) - from;
      return (
        <Sequence key={s.id} from={from} durationInFrames={dur} name={s.id}>
          <Fade first={i === 0}>
            <Comp dur={dur} at={at} />
          </Fade>
        </Sequence>
      );
    })}
    {/* vignette */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
    <Captions />
    {VO.audio ? <Audio src={staticFile(VO.audio)} volume={1} /> : null}
    <Audio src={staticFile("sfx.wav")} volume={0.75} />
  </AbsoluteFill>
);
