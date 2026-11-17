import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
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
        shadows="soft"
        frameloop="demand"
        camera={{ fov: 40, near: 0.03, far: 1200, position: [0, 2, 10] }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: exposure, preserveDrawingBuffer: true }}
      >
        {children}
        <Env intensity={envIntensity} />
        <ShadowSetup />
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

/** Every opaque mesh casts and receives shadows (the reference's crisp key-light shadows). */
const ShadowSetup: React.FC = () => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      const opaque = mat && !(mat as THREE.Material).transparent;
      m.castShadow = !!opaque;
      m.receiveShadow = true;
    });
  });
  return null;
};

/** Key light with shadows. */
export const KeyLight: React.FC<{ position: [number, number, number]; target?: [number, number, number]; intensity?: number; color?: string; size?: number }> = ({
  position,
  target = [0, 0, 0],
  intensity = 2,
  color = "#ffffff",
  size = 20,
}) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(...target);
  return (
    <>
      <primitive object={tgt} />
      <directionalLight
        position={position}
        target={tgt}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={0.5}
        shadow-camera-far={size * 8}
      />
    </>
  );
};
