import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

/**
 * Hand-drawn ink outlines (the reference look): screen-space edge detection on the depth buffer.
 * Draws a dark line wherever depth jumps (object silhouettes, overlaps, ground contact),
 * scaled with distance so far-away detail doesn't turn into noise.
 */
const frag = /* glsl */ `
uniform vec2 px;
uniform vec3 ink;
uniform float strength;
uniform float sens;

float vz(vec2 uv) {
  float d = readDepth(uv);
  return -getViewZ(d);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float c = vz(uv);
  if (c > 380.0) { outputColor = inputColor; return; }
  float e = 0.0;
  vec2 o1 = px * 2.2;
  float l = vz(uv - vec2(o1.x, 0.0));
  float r = vz(uv + vec2(o1.x, 0.0));
  float d = vz(uv - vec2(0.0, o1.y));
  float u = vz(uv + vec2(0.0, o1.y));
  // second-derivative style test: detects silhouettes without lining smooth slopes
  float lap = abs(l + r + d + u - 4.0 * c);
  float jump = max(max(abs(l - c), abs(r - c)), max(abs(d - c), abs(u - c)));
  e = smoothstep(sens * c, sens * c * 2.2, max(lap * 0.6, jump));
  // thin lines with distance
  e *= mix(1.0, 0.35, smoothstep(25.0, 160.0, c));
  outputColor = vec4(mix(inputColor.rgb, ink, clamp(e * strength, 0.0, 1.0)), inputColor.a);
}
`;

export class InkEffect extends Effect {
  constructor({ width = 1080, height = 1920, strength = 0.9, sens = 0.035, ink = "#15131c" } = {}) {
    super("InkEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, THREE.Uniform>([
        ["px", new THREE.Uniform(new THREE.Vector2(1 / width, 1 / height))],
        ["ink", new THREE.Uniform(new THREE.Color(ink))],
        ["strength", new THREE.Uniform(strength)],
        ["sens", new THREE.Uniform(sens)],
      ]),
    });
  }
}
