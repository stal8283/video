import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useVideoConfig } from "remotion";
import * as THREE from "three";

export const Stage: React.FC<{ children: React.ReactNode; exposure?: number; style?: React.CSSProperties }> = ({ children, exposure = 1.45, style }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={style}>
      <ThreeCanvas
        width={width}
        height={height}
        dpr={1}
        camera={{ fov: 40, near: 0.03, far: 1200, position: [0, 2, 10] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, preserveDrawingBuffer: true }}
      >
        {children}
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
