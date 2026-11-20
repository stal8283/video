// Render quality and look style, chosen per render from the command line (no code change):
//   npx remotion render ... --props='{"quality":"draft","style":"soft"}'
// The scripts (scripts/render.py, scripts/preview.py) pass these for you.
//
//   draft   : the fastest look check. No ambient occlusion, no depth of field, no motion blur, 1x ink buffers,
//             small shadow maps. Use it for blocking, timing and camera checks.
//   preview : what you show for approval. Everything on at a lighter cost (AO 8 samples, 1x ink buffers).
//   final   : the shipped frame. AO 12 samples, 2x anti-aliased ink, 2048 shadows, motion blur.
//
// style:
//   ink  : bold drawn outlines on a tinted 3-tone toon ramp (the comic-book look)
//   soft : smooth wide shading, thinner softer outlines, stronger ambient occlusion, a bit more glow (the
//          animated-movie look that still keeps a light ink line)
import { getInputProps } from "remotion";

export type Quality = "draft" | "preview" | "final";
export type Style = "ink" | "soft";

type QualitySpec = { ss: 1 | 2; ao: boolean; aoSamples: number; dof: boolean; motion: boolean; shadowMap: number };
export const QUALITY: Record<Quality, QualitySpec> = {
  draft: { ss: 1, ao: false, aoSamples: 0, dof: false, motion: false, shadowMap: 1024 },
  preview: { ss: 1, ao: true, aoSamples: 8, dof: true, motion: true, shadowMap: 2048 },
  final: { ss: 2, ao: true, aoSamples: 12, dof: true, motion: true, shadowMap: 2048 },
};

/** per-style changes on top of a mood's post settings and materials */
export const STYLE = {
  ink: { inkWidth: 1, inkStrength: 1, inkLighten: 0, normalThr: 1, ao: 0.75, aoRadius: 0.35, bloom: 1, sharpen: 1, toonSoft: 0, charInk: 1 },
  soft: { inkWidth: 0.72, inkStrength: 0.82, inkLighten: 0.22, normalThr: 1.45, ao: 1.0, aoRadius: 0.5, bloom: 1.25, sharpen: 0.55, toonSoft: 1, charInk: 0.7 },
} as const;

const props = (): Record<string, unknown> => {
  try {
    return (getInputProps() ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
};
/** the quality of this render: --props quality, else "final" */
export const renderQuality = (): Quality => {
  const q = props().quality;
  return q === "draft" || q === "preview" || q === "final" ? q : "final";
};
/** the style of this render: --props style wins (to compare both looks without editing code), then the
 * composition's own choice, else "ink" */
export const renderStyle = (own?: Style): Style => {
  const s = props().style;
  if (s === "soft" || s === "ink") return s;
  return own ?? "ink";
};
