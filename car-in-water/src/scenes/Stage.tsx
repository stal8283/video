import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { Env } from "../three/World";
import { Post } from "../three/Post";

export const Stage: React.FC<{ children: React.ReactNode; exposure?: number; style?: React.CSSProperties; envIntensity?: number; bloom?: number }> = ({ children, exposure = 1.45, style, envIntensity = 0.35, bloom = 0.9 }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        frameloop="demand"
        camera={{ fov: 40, near: 0.03, far: 1200, position: [0, 2, 10] }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, preserveDrawingBuffer: true }}
      >
        {children}
        <Env intensity={envIntensity} />
        <Post bloom={bloom} />
        <Invalidate />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

/** Two shots inside one scene, crossfaded over `len` frames at frame `at`. */
export const XFade: React.FC<{ f: number; at: number; len?: number; a: React.ReactNode; b: React.ReactNode }> = ({ f, at, len = 8, a, b }) => {
  const o = Math.min(1, Math.max(0, (f - at) / len));
  return (
    <AbsoluteFill>
      {o < 1 && <AbsoluteFill>{a}</AbsoluteFill>}
      {o > 0 && <AbsoluteFill style={{ opacity: o }}>{b}</AbsoluteFill>}
    </AbsoluteFill>
  );
};

/** Render exactly once per Remotion frame (instead of R3F's continuous loop). */
const Invalidate: React.FC = () => {
  const f = useCurrentFrame();
  const { invalidate } = useThree();
  useLayoutEffect(() => {
    invalidate();
  }, [f, invalidate]);
  return null;
};
