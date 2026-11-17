import { Bloom, EffectComposer, SMAA, Vignette, BrightnessContrast, HueSaturation } from "@react-three/postprocessing";
import { useMemo } from "react";
import { InkEffect } from "./Ink";

/** Reference look: ink outlines, bloom on lights, SMAA edges, punchy saturated grade + vignette. */
export const Post: React.FC<{ bloom?: number; threshold?: number; ink?: number }> = ({ bloom = 0.8, threshold = 0.85, ink = 1.0 }) => {
  const inkFx = useMemo(() => new InkEffect({ strength: ink }), [ink]);
  return (
    <EffectComposer multisampling={0}>
      <primitive object={inkFx} />
      <SMAA />
      <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
      <HueSaturation saturation={0.22} />
      <BrightnessContrast brightness={0.03} contrast={0.08} />
      <Vignette offset={0.35} darkness={0.45} />
    </EffectComposer>
  );
};
