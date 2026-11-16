import { Bloom, EffectComposer, SMAA, Vignette, BrightnessContrast, HueSaturation } from "@react-three/postprocessing";

/** Film look: bloom on bright lights (lamps, screens, headlights), SMAA edges, gentle grade + vignette. */
export const Post: React.FC<{ bloom?: number; threshold?: number }> = ({ bloom = 0.9, threshold = 0.82 }) => (
  <EffectComposer multisampling={0}>
    <SMAA />
    <Bloom intensity={bloom} luminanceThreshold={threshold} luminanceSmoothing={0.25} mipmapBlur radius={0.7} />
    <HueSaturation saturation={0.12} />
    <BrightnessContrast contrast={0.06} />
    <Vignette offset={0.32} darkness={0.55} />
  </EffectComposer>
);
