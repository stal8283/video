import * as THREE from "three";
// GLSL for the PostFX pipeline. All passes are fullscreen triangles drawn with
// THREE.ShaderMaterial (WebGL2 / GLSL ES 3.00 via three's prefix, so texture2D/gl_FragColor work).

export const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Shared helpers: depth buffer value -> positive view distance.
const DEPTH_HELPERS = /* glsl */ `
uniform float uNear;
uniform float uFar;
uniform float uPersp;
float viewDist(float d) {
  if (uPersp > 0.5) {
    // perspectiveDepthToViewZ, negated (positive distance)
    return (uNear * uFar) / ((uFar - uNear) * d - uFar) * -1.0;
  }
  return uNear + d * (uFar - uNear);
}
`;

// ---------------------------------------------------------------------------
// 1. Edge detection on the normal+depth buffer.
//    Output: r = edge strength (1px line, drawn on the NEAR side of a silhouette),
//            g = distance fade 0 (near) .. 1 (far), b = unused, a = 1.
// Depth test: second derivative of 1/z (which is affine in screen space for planes, so slanted
// floors and walls produce no false lines), relative to 1/z at the center (scale-invariant).
export const EDGE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uDepthThr;
uniform float uNormalThr;
uniform float uJump;
uniform float uIdEdge;
uniform float uFadeNear;
uniform float uFadeFar;
${DEPTH_HELPERS}

float invZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  if (d >= 0.999999) return 0.0;   // background (cleared depth): treat as infinitely far
  return 1.0 / max(viewDist(d), 1e-4);
}
vec4 nrm(vec2 uv) {
  vec4 n = texture2D(tNormal, uv);
  return vec4(n.xyz * 2.0 - 1.0, n.a);
}

void main() {
  float wc = invZ(vUv);
  vec4 nc = nrm(vUv);
  float edge = 0.0;
  if (nc.a > 0.5 && wc > 0.0) {
    // --- depth: near side of silhouettes
    vec2 dirs[4];
    dirs[0] = vec2(1.0, 0.0); dirs[1] = vec2(0.0, 1.0); dirs[2] = vec2(1.0, 1.0); dirs[3] = vec2(1.0, -1.0);
    float dEdge = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = dirs[i] * uTexel;
      float wa = invZ(vUv + o);
      float wb = invZ(vUv - o);
      // center nearer than the average of its neighbors -> negative second derivative
      float lap = (2.0 * wc - wa - wb) / wc;
      // also a hard one-sided jump (thin objects in front of far background)
      float jump = max(wc - wa, wc - wb) / wc * uJump;
      float k = (i >= 2) ? 0.85 : 1.0;
      dEdge = max(dEdge, k * max(lap * 0.5, jump));
    }
    float depthEdge = smoothstep(uDepthThr, uDepthThr * 1.8, dEdge);

    // --- normals: creases. Compare with the right and down neighbors (1px, one-sided),
    // and only against geometry that is not clearly farther (that case is a silhouette).
    float nEdge = 0.0;
    vec2 offs[2];
    offs[0] = vec2(1.0, 0.0); offs[1] = vec2(0.0, 1.0);
    for (int i = 0; i < 2; i++) {
      vec2 uv2 = vUv + offs[i] * uTexel;
      vec4 nb = nrm(uv2);
      if (nb.a < 0.5) continue;
      float wb = invZ(uv2);
      float diff = 1.0 - dot(normalize(nc.xyz), normalize(nb.xyz));
      float sameDepth = 1.0 - smoothstep(0.03, 0.12, abs(wb - wc) / wc);
      nEdge = max(nEdge, diff * sameDepth);
    }
    float normalEdge = smoothstep(uNormalThr, uNormalThr * 1.6 + 0.02, nEdge);
    edge = max(depthEdge, normalEdge);
    // --- object boundaries: the neighbor belongs to another object (id in the normal pass alpha) and is not
    // nearer -> ink on this side. Solid along the whole boundary, no threshold to hover around.
    if (uIdEdge > 0.0) {
      vec2 io[4];
      io[0] = vec2(1.0, 0.0); io[1] = vec2(-1.0, 0.0); io[2] = vec2(0.0, 1.0); io[3] = vec2(0.0, -1.0);
      float idE = 0.0;
      for (int i = 0; i < 4; i++) {
        vec2 uv2 = vUv + io[i] * uTexel;
        vec4 nb = nrm(uv2);
        if (nb.a < 0.5 || abs(nb.a - nc.a) < 0.002) continue;
        if (invZ(uv2) <= wc * 1.0005) idE = 1.0;
      }
      edge = max(edge, idE * uIdEdge);
    }
  }
  float dist = wc > 0.0 ? 1.0 / wc : uFar;
  float fade = smoothstep(uFadeNear, uFadeFar, dist);
  gl_FragColor = vec4(edge, fade, 0.0, 1.0);
}`;

// ---------------------------------------------------------------------------
// 2. Grade + ink: bloom add, exposure, highlight shoulder, sRGB encode, contrast, lift/gamma/gain,
//    saturation, split toning (all in display space), then the ink lines are drawn ON TOP of the
//    graded image (so they keep their exact color), and the signed circle of confusion (px,
//    negative = in front of the focus) is written to alpha for the DOF pass.
export const INK_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tEdge;
uniform sampler2D tDepth;
uniform sampler2D tBloom;
uniform sampler2D tAO;       // ambient occlusion (r = 1 open .. 0 occluded)
uniform float uAO;           // 0 = off
uniform vec3 uAOTint;        // linear color of a fully occluded crevice (colored, never gray)
uniform vec2 uTexel;
uniform float uOutline;      // 0/1
uniform vec3 uInk;           // display (sRGB) color
uniform float uWidth;        // px, already scaled to the render size
uniform float uStrength;
uniform float uFarWidth;
uniform float uFarOpacity;
uniform float uDof;          // 0/1
uniform float uFocus;
uniform float uFocusRange;
uniform float uMaxBlur;      // px, scaled
uniform float uBloom;        // strength (0 = off)
uniform vec3 uBloomTint;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform vec3 uLift;
uniform vec3 uGamma;
uniform vec3 uGain;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
uniform float uSplit;
uniform float uWobble;
uniform float uSharpen;
uniform vec2 uRes;
${DEPTH_HELPERS}

const int MAXI = 9;
uniform float uSS;      // edge-mask supersampling (1 or 2)
uniform float uSSOff;   // 0 for 1x, 0.5 for 2x (texel-center offset)

// Hash without Sine (c) 2014 David Hoskins, MIT; see THIRD_PARTY_NOTICES.md
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toSRGB(vec3 c) {
  c = max(c, vec3(0.0));
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}
// soft shoulder: linear up to 0.8, then rolls off toward 1
vec3 shoulder(vec3 x) {
  vec3 t = max(x - 0.8, 0.0);
  vec3 r = 0.8 + 0.2 * (1.0 - exp(-t / 0.2));
  return mix(x, r, step(0.8, x));
}

// uLiq: 0..1, how much of this pixel is "thick dark liquid" (core/liquid.tsx marks it with scene alpha 0.4). Liquids
// keep their own dark floor: the mood lift (which turns a near-black into a mid plum-brown) mostly skips them.
float uLiq = 0.0;
vec3 grade(vec3 c) {
  c *= exp2(uExposure);
  // highlight shoulder on the max channel (keeps hue), then per channel
  float M = max(c.r, max(c.g, c.b));
  float Ms = shoulder(vec3(M)).x;
  vec3 hue = c * ((M > 1e-5) ? Ms / M : 1.0);
  // over-exposed practicals burn toward a cream-white core
  float burn = clamp((M - 1.0) / 3.0, 0.0, 0.75);
  c = mix(hue, vec3(Ms) * vec3(1.0, 0.97, 0.9), burn);
  c = toSRGB(c);
  // contrast on luminance (does not over-saturate): stretch around 0.46 blended with a smooth S,
  // applied half as a ratio and half additively so dark saturated colors stay rich
  float Lc = clamp(luma(c), 0.0, 1.0);
  float Ll = (Lc - 0.46) * uContrast + 0.46;
  float Ls2 = Lc * Lc * (3.0 - 2.0 * Lc);
  float Lt = clamp(mix(Ll, Ls2, clamp((uContrast - 1.0) * 0.8, 0.0, 0.6)), 0.0, 1.0);
  vec3 cr = c * (Lt / max(Lc, 1e-4));
  vec3 ca = c + (Lt - Lc);
  c = clamp(mix(cr, ca, 0.5), 0.0, 1.0);
  // lift / gamma / gain. lift neutral #000, gamma neutral #808080 (maps 0.5 -> value), gain neutral #fff
  c = c * uGain + uLift * (1.0 - 0.88 * uLiq) * (1.0 - c);
  c = clamp(c, 0.0, 1.0);
  vec3 gExp = log(vec3(0.5)) / log(clamp(uGamma, vec3(0.02), vec3(0.98)));
  c = pow(c, gExp);
  // saturation (luma preserving)
  float l2 = luma(c);
  c = mix(vec3(l2), c, uSaturation);
  // split toning: chroma of the tint colors added by luminance band
  float l3 = clamp(luma(c), 0.0, 1.0);
  float wS = 1.0 - smoothstep(0.05, 0.5, l3);
  float wH = smoothstep(0.55, 1.0, l3);
  c += (uShadowTint - luma(uShadowTint)) * uSplit * wS;
  c += (uHighTint - luma(uHighTint)) * uSplit * wH;
  return clamp(c, 0.0, 1.0);
}

void main() {
  vec4 scene0 = texture2D(tScene, vUv);
  vec3 col = scene0.rgb;
  // liquid marker (alpha 0.4; MSAA edges against alpha 1 resolve in between; the clear color has alpha 0)
  uLiq = clamp((1.0 - scene0.a) / 0.6, 0.0, 1.0) * step(0.2, scene0.a);
  if (uSharpen > 0.0) {
    // local contrast ("clarity"): luminance unsharp mask, radius ~2.5 px
    vec3 b = vec3(0.0);
    b += texture2D(tScene, vUv + vec2( 2.5,  0.0) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2(-2.5,  0.0) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2( 0.0,  2.5) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2( 0.0, -2.5) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2( 1.8,  1.8) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2(-1.8,  1.8) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2( 1.8, -1.8) * uTexel).rgb;
    b += texture2D(tScene, vUv + vec2(-1.8, -1.8) * uTexel).rgb;
    b /= 8.0;
    float l0 = luma(col), lb = luma(b);
    float k = clamp(1.0 + uSharpen * (l0 - lb) / max(lb + 0.05, 1e-3), 0.6, 1.6);
    col *= k;
  }
  if (uAO > 0.0) {
    float ao = texture2D(tAO, vUv).r;
    col *= mix(uAOTint, vec3(1.0), mix(1.0, ao, uAO * (1.0 - uLiq)));
  }
  if (uBloom > 0.0) col += texture2D(tBloom, vUv).rgb * uBloom * uBloomTint;
  col = grade(col);
  if (uOutline > 0.5) {
    float ink = 0.0;
    // hand-inked variation: slow noise along the frame modulates width and density
    vec2 px = vUv * vec2(1080.0, 1080.0 * uRes.y / uRes.x);
    float nz = vnoise(px / 46.0) * 0.65 + vnoise(px / 13.0 + 7.3) * 0.35;
    float wMul = 1.0 + uWobble * (nz - 0.5) * 1.3;
    // the edge mask may be supersampled (uSS = 2): march its texel centers in 1x-pixel units,
    // so the ink is a distance field to a half-pixel-accurate line (anti-aliased)
    float wMax = uWidth * wMul;
    float dMax = wMax * 0.5 + 0.75;
    for (int y = -MAXI; y <= MAXI; y++) {
      for (int x = -MAXI; x <= MAXI; x++) {
        vec2 o = (vec2(float(x), float(y)) + uSSOff) / uSS;
        float d = length(o);
        if (d > dMax) continue;
        vec4 e = texture2D(tEdge, vUv + o * uTexel);
        if (e.r <= 0.001) continue;
        float w = wMax * mix(1.0, uFarWidth, e.g);
        float cov = clamp(w * 0.5 - d + 0.5, 0.0, 1.0);
        ink = max(ink, cov * e.r * mix(1.0, uFarOpacity, e.g));
      }
    }
    col = mix(col, uInk, clamp(ink * uStrength, 0.0, 1.0));
  }
  float coc = 0.0;
  if (uDof > 0.5) {
    float d = texture2D(tDepth, vUv).x;
    float z = d >= 0.999999 ? 1e6 : viewDist(d);
    // thin-lens CoC |1 - f/z|, normalized so that z = focus + focusRange gives the full blur
    float f = max(uFocus, 0.01);
    float norm = 1.0 - f / (f + max(uFocusRange, 0.01));
    float c = (1.0 - f / max(z, 0.001)) / max(norm, 1e-3);
    // small sharp zone around the focus
    float s = sign(c) * max(abs(c) - 0.06, 0.0) / 0.94;
    coc = clamp(s, -1.6, 1.0) * uMaxBlur;
  }
  gl_FragColor = vec4(col, coc);
}`;

// ---------------------------------------------------------------------------
// 3. Depth of field: a scatter-as-gather over a fixed disk of taps.
//    Each tap is a neighbor pixel whose own blur disk (|signed CoC| in alpha) may or may not reach this
//    pixel. A neighbor that lies BEHIND this pixel may only spread as far as this pixel's own blur, so a
//    sharp foreground keeps its edge against a blurred background; a neighbor IN FRONT spreads by its full
//    blur, so an out-of-focus foreground softly covers what is behind it. Each tap's weight is divided by its
//    blur area, so a wide, soft disk does not outweigh a small, sharp one. The tap table (DOF_TAP_COUNT
//    points on a golden-angle spiral, unit radius, radius in z) is built once in TypeScript: dofTaps().
export const DOF_TAP_COUNT = 64;
export const dofTaps = (n = DOF_TAP_COUNT) =>
  Array.from({ length: n }, (_, i) => {
    const rad = Math.sqrt((i + 0.5) / n);
    const ang = i * 2.399963229728653; // the golden angle
    return new THREE.Vector3(rad * Math.cos(ang), rad * Math.sin(ang), rad);
  });
export const DOF_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;            // rgb + signed CoC in px (alpha); negative = in front of the focus
uniform vec2 uTexel;
uniform float uMaxBlur;              // px: the gather disk radius
uniform vec3 uTaps[${DOF_TAP_COUNT}];       // unit disk offsets (xy) and their radius (z)

// how much of a neighbor's blur disk (radius px) covers a point at distance dist px; soft over 1 px
float reach(float radius, float dist) {
  return clamp(radius - dist + 1.0, 0.0, 1.0);
}

void main() {
  vec4 here = texture2D(tColor, vUv);
  float hereBlur = abs(here.a);
  // the pixel itself, weighted by the inverse of its blur area like every tap
  float hereW = 1.0 / max(hereBlur * hereBlur, 1.0);
  vec3 sum = here.rgb * hereW;
  float wsum = hereW;
  for (int k = 0; k < ${DOF_TAP_COUNT}; k++) {
    vec3 tap = uTaps[k];
    float dist = tap.z * uMaxBlur;
    vec4 nb = texture2D(tColor, vUv + tap.xy * uMaxBlur * uTexel);
    float nbBlur = abs(nb.a);
    // nb.a > here.a: the neighbor is farther away than this pixel -> clamp its spread to this pixel's blur
    float spread = nb.a > here.a ? min(nbBlur, hereBlur) : nbBlur;
    float w = reach(spread, dist) / max(nbBlur * nbBlur, 1.0);
    sum += nb.rgb * w;
    wsum += w;
  }
  gl_FragColor = vec4(sum / wsum, here.a);
}`;

// ---------------------------------------------------------------------------
// 4. Bloom: prefilter (soft-knee threshold) + 13-tap downsample, then tent upsample.
export const BLOOM_PREFILTER_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;          // texel of the SOURCE
uniform float uThreshold;
uniform float uKnee;
vec3 tap(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
  // 13-tap (Jimenez 2014) downsample
  vec3 a = tap(vec2(-2.0, -2.0)), b = tap(vec2(0.0, -2.0)), c = tap(vec2(2.0, -2.0));
  vec3 d = tap(vec2(-1.0, -1.0)), e = tap(vec2(1.0, -1.0));
  vec3 f = tap(vec2(-2.0, 0.0)), g = tap(vec2(0.0, 0.0)), h = tap(vec2(2.0, 0.0));
  vec3 i = tap(vec2(-1.0, 1.0)), j = tap(vec2(1.0, 1.0));
  vec3 k = tap(vec2(-2.0, 2.0)), l = tap(vec2(0.0, 2.0)), m = tap(vec2(2.0, 2.0));
  vec3 col = (d + e + i + j) * 0.125 + (a + b + f + g) * 0.03125 + (b + c + g + h) * 0.03125
           + (f + g + k + l) * 0.03125 + (g + h + l + m) * 0.03125;
  float br = max(col.r, max(col.g, col.b));
  float soft = clamp(br - uThreshold + uKnee, 0.0, 2.0 * uKnee);
  soft = soft * soft / (4.0 * uKnee + 1e-4);
  float contrib = max(soft, br - uThreshold) / max(br, 1e-4);
  col *= contrib;
  col = min(col, vec3(40.0));
  gl_FragColor = vec4(col, 1.0);
}`;

export const DOWN_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uTexel;
vec3 tap(vec2 o) { return texture2D(tSrc, vUv + o * uTexel).rgb; }
void main() {
  vec3 a = tap(vec2(-2.0, -2.0)), b = tap(vec2(0.0, -2.0)), c = tap(vec2(2.0, -2.0));
  vec3 d = tap(vec2(-1.0, -1.0)), e = tap(vec2(1.0, -1.0));
  vec3 f = tap(vec2(-2.0, 0.0)), g = tap(vec2(0.0, 0.0)), h = tap(vec2(2.0, 0.0));
  vec3 i = tap(vec2(-1.0, 1.0)), j = tap(vec2(1.0, 1.0));
  vec3 k = tap(vec2(-2.0, 2.0)), l = tap(vec2(0.0, 2.0)), m = tap(vec2(2.0, 2.0));
  vec3 col = (d + e + i + j) * 0.125 + (a + b + f + g) * 0.03125 + (b + c + g + h) * 0.03125
           + (f + g + k + l) * 0.03125 + (g + h + l + m) * 0.03125;
  gl_FragColor = vec4(col, 1.0);
}`;

export const UP_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tLow;      // smaller level (already accumulated)
uniform sampler2D tHigh;     // this level's downsample
uniform vec2 uTexel;         // texel of tLow
uniform float uScatter;
vec3 tap(vec2 o) { return texture2D(tLow, vUv + o * uTexel).rgb; }
void main() {
  vec3 s = tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0))
         + 2.0 * (tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0)) + tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)))
         + 4.0 * tap(vec2(0.0));
  s /= 16.0;
  vec3 hi = texture2D(tHigh, vUv).rgb;
  gl_FragColor = vec4(mix(hi, s, uScatter), 1.0);
}`;

// ---------------------------------------------------------------------------
// 5. Final: vignette, paper grain, dither. Output alpha = 1.
export const FINAL_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform float uVigAmount;
uniform float uVigSoft;
uniform vec3 uVigColor;
uniform float uGrain;
uniform float uFrame;
uniform vec2 uRes;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// Hash without Sine (c) 2014 David Hoskins, MIT; see THIRD_PARTY_NOTICES.md
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}

void main() {
  vec3 c = texture2D(tColor, vUv).rgb;
  // vignette: radial in frame space, 0 at the center, 1 at the corners
  float rr = length((vUv - 0.5) * 2.0) / 1.41421;
  float v = smoothstep(1.0 - clamp(uVigSoft, 0.05, 1.0), 1.0, rr);
  c = mix(c, c * uVigColor, v * uVigAmount);
  // paper texture (static fibers, scaled to the frame) + fine grain (per frame)
  if (uGrain > 0.0) {
    vec2 px = vUv * vec2(1080.0, 1080.0 * uRes.y / uRes.x);
    float paper = fbm(px / 7.0) - 0.5 + 0.6 * (fbm(px / 38.0 + 3.7) - 0.5);
    float g = hash12(floor(vUv * uRes) + fract(uFrame * 0.6180339) * 913.0) - 0.5;
    float mid = 1.0 - abs(luma(c) - 0.5) * 1.3;
    c += (paper * 0.07 + g * 0.03) * uGrain * mid;
  }
  // dither against banding
  c += (hash12(gl_FragCoord.xy + uFrame * 7.0) - 0.5) / 255.0;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

// ---------------------------------------------------------------------------
// Normal-pass replacement for custom ShaderMaterials: keeps their vertex shader (so vertex
// displacement such as sea waves stays in place) and writes a camera-facing normal, so only
// depth silhouettes are drawn on them.
export const FLAT_NORMAL_FRAG = /* glsl */ `
void main() { gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0); }`;

// ---------------------------------------------------------------------------
// 6. Ambient occlusion (soft contact shadows in corners, under props, where objects meet).
//    Screen-space, from the normal/depth pass. A FIXED 4x4 rotation pattern (no per-frame noise: deterministic,
//    nothing crawls) that the blur pass below averages out exactly (it is 4x4 wide).
export const AO_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 uTan;          // tan(fov/2) * aspect, tan(fov/2)
uniform float uRadius;      // world meters
uniform float uPxPerUnit;   // px per meter at distance 1 (this target's resolution)
uniform float uMaxPx;
uniform vec2 uTexel;        // texel of THIS (AO) target
uniform int uSamples;
${DEPTH_HELPERS}
vec3 viewPos(vec2 uv, float z) { return vec3((uv * 2.0 - 1.0) * uTan * z, -z); }
float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  int i = int(q.x + q.y * 4.0);
  float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}
void main() {
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.999999) { gl_FragColor = vec4(1.0); return; }
  float z = viewDist(d);
  vec3 P = viewPos(vUv, z);
  vec3 N = normalize(texture2D(tNormal, vUv).xyz * 2.0 - 1.0);
  float rPx = clamp(uRadius / z * uPxPerUnit, 3.0, uMaxPx);
  float a0 = bayer4(gl_FragCoord.xy) * 6.2831853;
  float occ = 0.0;
  float wsum = 0.0;
  for (int i = 0; i < 16; i++) {
    if (i >= uSamples) break;
    float fi = float(i);
    float r = sqrt((fi + 0.5) / float(uSamples));
    float a = a0 + fi * 2.399963;
    vec2 uv2 = vUv + vec2(cos(a), sin(a)) * r * rPx * uTexel;
    float d2 = texture2D(tDepth, uv2).x;
    if (d2 >= 0.999999) { wsum += 1.0; continue; }
    vec3 P2 = viewPos(uv2, viewDist(d2));
    vec3 v = P2 - P;
    float L = length(v);
    float fall = 1.0 - smoothstep(uRadius * 0.5, uRadius * 1.5, L);
    occ += max(0.0, dot(N, v / max(L, 1e-4)) - 0.12) * fall;
    wsum += 1.0;
  }
  float ao = 1.0 - clamp(occ / max(wsum, 1.0) * 1.9, 0.0, 1.0);
  gl_FragColor = vec4(ao, z, 0.0, 1.0);
}`;
// depth-aware 4x4 average (exactly one period of the rotation pattern, so the pattern vanishes)
export const AO_BLUR_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tAO;
uniform vec2 uTexel;
void main() {
  vec2 c = texture2D(tAO, vUv).rg;
  float s = 0.0, w = 0.0;
  for (int y = -2; y <= 1; y++) for (int x = -2; x <= 1; x++) {
    vec2 o = (vec2(float(x), float(y)) + 0.5) * uTexel;
    vec2 t = texture2D(tAO, vUv + o).rg;
    float k = 1.0 / (1.0 + abs(t.g - c.g) / max(c.g * 0.04, 0.02));
    s += t.r * k; w += k;
  }
  gl_FragColor = vec4(s / max(w, 1e-4), 0.0, 0.0, 1.0);
}`;

// ---------------------------------------------------------------------------
// 7. Camera motion blur (nearly free; replaces the 4x sub-frame render for camera moves).
//    Every pixel is re-projected with the PREVIOUS frame's camera (a pure function of t - 1/fps, passed in),
//    then blurred along that screen velocity x the shutter (0.5 = 180 deg). Objects moving on their own are not
//    blurred (use the sub-frame recipe for a fast character action if it strobes).
export const MB_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform mat4 uInvProj;
uniform mat4 uCamWorld;
uniform mat4 uPrevVP;
uniform float uShutter;
uniform float uMaxPx;
uniform vec2 uRes;
void main() {
  float d = min(texture2D(tDepth, vUv).x, 0.99999);
  vec4 ndc = vec4(vUv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 vp = uInvProj * ndc; vp /= vp.w;
  vec4 wp = uCamWorld * vp;
  vec4 pp = uPrevVP * wp;
  vec2 prevUv = (pp.xy / pp.w) * 0.5 + 0.5;
  vec2 velPx = (vUv - prevUv) * uRes * uShutter;
  float Lp = length(velPx);
  if (pp.w <= 0.0 || Lp < 0.6) { gl_FragColor = vec4(texture2D(tColor, vUv).rgb, 1.0); return; }
  velPx *= min(1.0, uMaxPx / Lp);
  vec2 vel = velPx / uRes;
  vec3 s = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float t = (float(i) + 0.5) / 12.0 - 0.5;
    s += texture2D(tColor, vUv + vel * t).rgb;
  }
  gl_FragColor = vec4(s / 12.0, 1.0);
}`;
