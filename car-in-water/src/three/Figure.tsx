import { useMemo } from "react";
import * as THREE from "three";

/**
 * Character style matched to the reference videos:
 *  - big egg-shaped head (wider at the top), soft hand-shaded cream fill, thick navy-black outline
 *  - head sits straight on the body (no neck), overlapping its top
 *  - tall bean-shaped body that IS the clothing (shirt + tie + trousers), same thick outline
 *  - thin curved "noodle" arms ending in solid ball hands; long straight stick legs, no feet
 *  - wide-set pill eyes, thick tapered brows; ring eyes for shock; gridded-teeth grimace
 * Head/body are 2D cards drawn on canvas; they take scene light (Lambert + emissive) like the reference.
 * Drawn in the XY plane facing +Z. Units: head width ≈ 1.06.
 */
export type Expr = "neutral" | "happy" | "smug" | "shock" | "strain" | "worried" | "determined" | "talk";
type Arm = [number, number]; // shoulder angle, elbow bend (radians, 0 = straight down)

export type FigureProps = {
  expr?: Expr;
  mouthOpen?: number;
  look?: [number, number];
  armL?: Arm;
  armR?: Arm;
  legL?: Arm;
  legR?: Arm;
  shirt?: string;
  skin?: string;
  hair?: "none" | "kid" | "tuft";
  blink?: boolean;
  sweat?: number;
  showBody?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

const INK = "#1b1a24";
const INK_C = new THREE.Color(INK);

/* ------------------------------------------------------------------ textures */
const texCache = new Map<string, THREE.CanvasTexture>();
const makeTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  c.lineCap = "round";
  c.lineJoin = "round";
  draw(c);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
};

// head canvas: 600 x 640, egg centred at (300, 330)
const HW = 600;
const HH = 640;
const HCX = 300;
const HCY = 335;
const HA = 240; // half width
const HB = 262; // half height
const eggPath = (c: CanvasRenderingContext2D, grow = 0) => {
  c.beginPath();
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const s = Math.sin(t);
    const x = HCX + (HA + grow) * Math.cos(t) * (1 - 0.07 * s);
    const y = HCY + (HB + grow) * s;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
};

const pill = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
};

const brow = (c: CanvasRenderingContext2D, x: number, y: number, tilt: number, side: number, arch = 0.25) => {
  // thick tapered stroke: draw as filled crescent
  const L = 74;
  c.save();
  c.translate(x, y);
  c.rotate(tilt * side);
  c.beginPath();
  c.moveTo(-L / 2, 6);
  c.quadraticCurveTo(0, -L * arch - 10, L / 2, 6);
  c.quadraticCurveTo(0, -L * arch + 12, -L / 2, 6);
  c.fillStyle = INK;
  c.fill();
  c.lineWidth = 7;
  c.strokeStyle = INK;
  c.stroke();
  c.restore();
};

type FaceKey = { expr: Expr; mouth: number; look: [number, number]; blink: boolean; sweat: boolean; hair: string; skin: string };

const drawHead = (c: CanvasRenderingContext2D, k: FaceKey) => {
  // pigtails behind the head (kid)
  if (k.hair === "kid") {
    for (const s of [-1, 1]) {
      c.fillStyle = "#6b3f1f";
      c.strokeStyle = INK;
      c.lineWidth = 16;
      c.beginPath();
      c.ellipse(HCX + s * 245, HCY - 120, 52, 70, s * 0.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  }
  // fill with soft shading
  eggPath(c);
  const g = c.createRadialGradient(HCX - 80, HCY - 120, 20, HCX, HCY, 330);
  const base = new THREE.Color(k.skin);
  const lighter = base.clone().lerp(new THREE.Color("#ffffff"), 0.45).getStyle();
  const darker = base.clone().multiplyScalar(0.84).getStyle();
  g.addColorStop(0, lighter);
  g.addColorStop(0.55, base.getStyle());
  g.addColorStop(1, darker);
  c.fillStyle = g;
  c.fill();
  // shadow crescent lower-right + faint texture
  c.save();
  eggPath(c);
  c.clip();
  c.fillStyle = "rgba(90, 80, 110, 0.14)";
  c.beginPath();
  c.ellipse(HCX + 70, HCY + 120, 260, 220, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = base.clone().lerp(new THREE.Color("#ffffff"), 0.6).getStyle();
  c.beginPath();
  c.ellipse(HCX - 70, HCY - 60, 230, 220, -0.3, 0, Math.PI * 2);
  c.globalAlpha = 0.5;
  c.fill();
  c.globalAlpha = 1;
  for (let i = 0; i < 60; i++) {
    const a = (i * 2.3999) % (Math.PI * 2);
    const r = 40 + ((i * 97) % 200);
    c.fillStyle = "rgba(120,100,90,0.08)";
    c.beginPath();
    c.arc(HCX + Math.cos(a) * r, HCY - 60 + Math.sin(a) * r * 0.8, 3, 0, Math.PI * 2);
    c.fill();
  }
  // hair
  if (k.hair === "tuft" || k.hair === "none") {
    // neat side-parted hair cap (driver)
    c.fillStyle = "#5a3a22";
    c.beginPath();
    c.moveTo(HCX - 260, HCY - 90);
    c.bezierCurveTo(HCX - 250, HCY - 330, HCX + 250, HCY - 330, HCX + 262, HCY - 70);
    c.bezierCurveTo(HCX + 150, HCY - 190, HCX - 20, HCY - 210, HCX - 110, HCY - 150);
    c.bezierCurveTo(HCX - 160, HCY - 120, HCX - 220, HCY - 110, HCX - 260, HCY - 90);
    c.fill();
    c.strokeStyle = "rgba(255,220,180,0.35)";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(HCX - 40, HCY - 250);
    c.quadraticCurveTo(HCX + 120, HCY - 230, HCX + 200, HCY - 150);
    c.stroke();
    c.strokeStyle = INK;
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(HCX + 262, HCY - 70);
    c.bezierCurveTo(HCX + 150, HCY - 190, HCX - 20, HCY - 210, HCX - 110, HCY - 150);
    c.bezierCurveTo(HCX - 160, HCY - 120, HCX - 220, HCY - 110, HCX - 260, HCY - 90);
    c.stroke();
  } else if (k.hair === "kid") {
    c.fillStyle = "#6b3f1f";
    c.beginPath();
    c.moveTo(HCX - 250, HCY - 60);
    c.bezierCurveTo(HCX - 240, HCY - 330, HCX + 240, HCY - 330, HCX + 250, HCY - 60);
    c.bezierCurveTo(HCX + 140, HCY - 150, HCX + 60, HCY - 130, HCX, HCY - 175);
    c.bezierCurveTo(HCX - 60, HCY - 130, HCX - 140, HCY - 150, HCX - 250, HCY - 60);
    c.fill();
    c.strokeStyle = INK;
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(HCX + 250, HCY - 60);
    c.bezierCurveTo(HCX + 140, HCY - 150, HCX + 60, HCY - 130, HCX, HCY - 175);
    c.bezierCurveTo(HCX - 60, HCY - 130, HCX - 140, HCY - 150, HCX - 250, HCY - 60);
    c.stroke();
  }
  c.restore();
  // thick outline
  eggPath(c);
  c.strokeStyle = INK;
  c.lineWidth = 24;
  c.stroke();

  // ---- face ----
  const ey = HCY + 20;
  const ex = 92;
  const lx = k.look[0] * 14;
  const ly = k.look[1] * 10;
  c.fillStyle = INK;
  c.strokeStyle = INK;
  const e = k.expr;
  const ring = e === "shock" || e === "strain";
  for (const s of [-1, 1]) {
    const x = HCX + s * ex;
    if (k.blink) {
      c.lineWidth = 13;
      c.beginPath();
      c.moveTo(x - 30, ey + 4);
      c.quadraticCurveTo(x, ey + 18, x + 30, ey + 4);
      c.stroke();
    } else if (ring) {
      const r = e === "shock" ? 56 : 44;
      c.fillStyle = "#ffffff";
      c.beginPath();
      c.arc(x, ey - 4, r, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 15;
      c.stroke();
      c.fillStyle = INK;
      pill(c, x + lx * 1.4 - s * (e === "strain" ? 6 : 0), ey - 4 + ly, e === "shock" ? 14 : 15, e === "shock" ? 14 : 15);
    } else if (e === "smug") {
      pill(c, x + lx, ey + ly, 19, 26);
      c.fillStyle = k.skin;
      c.fillRect(x - 30, ey - 40, 60, 34);
      c.fillStyle = INK;
      c.lineWidth = 11;
      c.beginPath();
      c.moveTo(x - 28, ey - 6);
      c.lineTo(x + 28, ey - 8);
      c.stroke();
    } else {
      pill(c, x + lx, ey + ly, 19, 31);
    }
  }
  // brows
  const by = ey - (ring ? 86 : 70);
  const tilt = { neutral: 0.05, happy: -0.05, smug: 0.1, shock: -0.2, strain: 0.42, worried: -0.38, determined: 0.3, talk: 0 }[e];
  for (const s of [-1, 1]) brow(c, HCX + s * (ex + 6), by - (e === "shock" ? 14 : 0), tilt, -s, e === "worried" ? 0.05 : 0.22);
  // mouth
  const my = HCY + 150;
  c.lineWidth = 13;
  c.fillStyle = INK;
  c.strokeStyle = INK;
  if (e === "strain") {
    c.fillStyle = "#ffffff";
    c.beginPath();
    c.roundRect(HCX - 66, my - 36, 132, 72, 18);
    c.fill();
    c.lineWidth = 11;
    c.stroke();
    c.lineWidth = 7;
    for (const x of [-33, 0, 33]) {
      c.beginPath();
      c.moveTo(HCX + x, my - 36);
      c.lineTo(HCX + x, my + 36);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(HCX - 66, my);
    c.lineTo(HCX + 66, my);
    c.stroke();
  } else if (e === "shock" || k.mouth > 0.15) {
    const o = e === "shock" ? 1 : k.mouth;
    const w = e === "shock" ? 38 : 46;
    const h = 12 + 40 * o;
    c.beginPath();
    c.ellipse(HCX, my - 5, w, h, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e25b6e";
    c.beginPath();
    c.ellipse(HCX, my - 5 + h * 0.45, w * 0.6, h * 0.38, 0, 0, Math.PI * 2);
    c.fill();
  } else if (e === "happy") {
    c.beginPath();
    c.moveTo(HCX - 70, my - 22);
    c.quadraticCurveTo(HCX, my + 44, HCX + 70, my - 22);
    c.stroke();
  } else if (e === "smug") {
    c.beginPath();
    c.moveTo(HCX - 50, my - 4);
    c.quadraticCurveTo(HCX + 10, my + 22, HCX + 66, my - 22);
    c.stroke();
  } else if (e === "worried") {
    c.beginPath();
    c.moveTo(HCX - 56, my + 10);
    c.bezierCurveTo(HCX - 25, my - 18, HCX + 0, my + 18, HCX + 25, my - 6);
    c.quadraticCurveTo(HCX + 45, my - 14, HCX + 58, my + 8);
    c.stroke();
  } else if (e === "determined") {
    c.beginPath();
    c.moveTo(HCX - 52, my);
    c.quadraticCurveTo(HCX, my - 10, HCX + 52, my + 2);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(HCX - 40, my);
    c.quadraticCurveTo(HCX, my + 8, HCX + 40, my);
    c.stroke();
  }
  // blush
  if (e === "happy" || e === "smug") {
    c.fillStyle = "rgba(240,120,130,0.28)";
    for (const s of [-1, 1]) pill(c, HCX + s * 165, ey + 70, 38, 22);
  }
  // sweat drop
  if (k.sweat) {
    const x = HCX + 225;
    const y = HCY - 150;
    c.fillStyle = "#8fd6ff";
    c.strokeStyle = INK;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(x, y - 46);
    c.quadraticCurveTo(x + 34, y + 4, x, y + 22);
    c.quadraticCurveTo(x - 34, y + 4, x, y - 46);
    c.fill();
    c.stroke();
    c.fillStyle = "rgba(255,255,255,0.8)";
    pill(c, x - 6, y + 2, 6, 9);
  }
};

// body canvas 420 x 640: bean shape (clothing = body)
const BW = 420;
const BH = 640;
const beanPath = (c: CanvasRenderingContext2D) => {
  c.beginPath();
  c.moveTo(70, 120);
  c.bezierCurveTo(70, 30, 350, 30, 350, 120);
  c.bezierCurveTo(372, 300, 385, 470, 340, 560);
  c.bezierCurveTo(300, 625, 120, 625, 80, 560);
  c.bezierCurveTo(35, 470, 48, 300, 70, 120);
  c.closePath();
};
const drawBody = (c: CanvasRenderingContext2D, shirt: string, kind: "driver" | "kid") => {
  const base = new THREE.Color(shirt);
  beanPath(c);
  c.save();
  c.clip();
  const g = c.createLinearGradient(40, 0, 380, 0);
  g.addColorStop(0, base.clone().lerp(new THREE.Color("#ffffff"), 0.2).getStyle());
  g.addColorStop(0.6, base.getStyle());
  g.addColorStop(1, base.clone().multiplyScalar(0.72).getStyle());
  c.fillStyle = g;
  c.fillRect(0, 0, BW, BH);
  if (kind === "driver") {
    // trousers + belt
    c.fillStyle = "#2b3348";
    c.fillRect(0, 470, BW, 200);
    c.fillStyle = "#1b1a24";
    c.fillRect(0, 458, BW, 26);
    c.fillStyle = "#c9b27a";
    c.fillRect(190, 456, 40, 30);
    // button placket + buttons
    c.strokeStyle = "rgba(0,0,0,0.25)";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(210, 90);
    c.lineTo(212, 455);
    c.stroke();
    // pocket
    c.strokeStyle = "rgba(0,0,0,0.3)";
    c.lineWidth = 6;
    c.strokeRect(95, 170, 70, 62);
    // tie
    c.fillStyle = "#c8452f";
    c.strokeStyle = INK;
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(186, 70);
    c.lineTo(234, 70);
    c.lineTo(226, 110);
    c.lineTo(252, 350);
    c.lineTo(210, 400);
    c.lineTo(168, 350);
    c.lineTo(194, 110);
    c.closePath();
    c.fill();
    c.stroke();
    c.strokeStyle = "rgba(255,210,120,0.8)";
    c.lineWidth = 9;
    for (let y = 150; y < 360; y += 48) {
      c.beginPath();
      c.moveTo(190, y + 14);
      c.lineTo(236, y - 10);
      c.stroke();
    }
    // collar
    c.fillStyle = base.clone().lerp(new THREE.Color("#ffffff"), 0.55).getStyle();
    c.strokeStyle = INK;
    c.lineWidth = 9;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(210, 60);
      c.lineTo(210 + s * 90, 52);
      c.lineTo(210 + s * 52, 128);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else {
    // hoodie: pocket + drawstrings + shorts
    c.fillStyle = "#3a5fa8";
    c.fillRect(0, 500, BW, 200);
    c.strokeStyle = "rgba(0,0,0,0.3)";
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(120, 420);
    c.lineTo(300, 420);
    c.lineTo(330, 490);
    c.lineTo(90, 490);
    c.closePath();
    c.stroke();
    c.strokeStyle = "#fff4dc";
    c.lineWidth = 8;
    for (const x of [180, 240]) {
      c.beginPath();
      c.moveTo(x, 80);
      c.lineTo(x, 200);
      c.stroke();
    }
  }
  // fabric fold lines
  c.strokeStyle = "rgba(0,0,0,0.12)";
  c.lineWidth = 5;
  for (const x of [130, 300]) {
    c.beginPath();
    c.moveTo(x, 260);
    c.quadraticCurveTo(x + 10, 340, x - 4, 430);
    c.stroke();
  }
  c.restore();
  beanPath(c);
  c.strokeStyle = INK;
  c.lineWidth = 24;
  c.stroke();
};

/* ------------------------------------------------------------------ materials */
const cardMat = (tex: THREE.Texture) => {
  const m = new THREE.MeshLambertMaterial({ map: tex, color: new THREE.Color("#a9a9a9"), transparent: true, alphaTest: 0.4, emissive: new THREE.Color("#ffffff"), emissiveMap: tex, emissiveIntensity: 0.2, side: THREE.DoubleSide });
  return m;
};
const matCache = new Map<string, THREE.Material>();
const cardMatFor = (key: string, tex: THREE.Texture) => {
  let m = matCache.get(key);
  if (!m) {
    m = cardMat(tex);
    matCache.set(key, m);
  }
  return m;
};
const INK_MAT = new THREE.MeshBasicMaterial({ color: INK_C });
const plane = new THREE.PlaneGeometry(1, 1);
const ball = new THREE.SphereGeometry(1, 16, 12);

/** smooth noodle limb from a to b, bowing through the "elbow" control point */
const Noodle: React.FC<{ a: [number, number]; e: [number, number]; b: [number, number]; r: number; z: number }> = ({ a, e, b, r, z }) => {
  // control point that makes the quadratic pass through the elbow at t=0.5
  const cx = 2 * e[0] - (a[0] + b[0]) / 2;
  const cy = 2 * e[1] - (a[1] + b[1]) / 2;
  const geo = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], a[1], z), new THREE.Vector3(cx, cy, z), new THREE.Vector3(b[0], b[1], z));
    return new THREE.TubeGeometry(curve, 16, r, 6, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a[0], a[1], cx, cy, b[0], b[1], r, z]);
  return <mesh geometry={geo} material={INK_MAT} />;
};

const limb = (o: [number, number], [a1, a2]: Arm, l1: number, l2: number) => {
  const e: [number, number] = [o[0] + Math.sin(a1) * l1, o[1] - Math.cos(a1) * l1];
  const h: [number, number] = [e[0] + Math.sin(a1 + a2) * l2, e[1] - Math.cos(a1 + a2) * l2];
  return { e, h };
};
const q = (v: number, n = 0.02) => Math.round(v / n) * n;

export const Figure: React.FC<FigureProps> = ({
  expr = "neutral",
  mouthOpen = 0,
  look = [0, 0],
  armL = [0.2, 0.25],
  armR = [-0.2, -0.25],
  legL = [0.05, 0],
  legR = [-0.05, 0],
  shirt = "#4f7fd6",
  skin = "#f6f0e6",
  hair = "none",
  blink = false,
  sweat = 0,
  showBody = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => {
  const kid = hair === "kid";
  const mouthQ = expr === "talk" ? Math.max(0.35, Math.round(mouthOpen * 3) / 3) : Math.round(mouthOpen * 3) / 3;
  const lookQ: [number, number] = [Math.round(look[0] * 4) / 4, Math.round(look[1] * 4) / 4];
  const fk: FaceKey = { expr, mouth: mouthQ, look: lookQ, blink, sweat: sweat > 0.3, hair, skin };
  const hkey = `head|${JSON.stringify(fk)}`;
  const headTex = makeTex(hkey, HW, HH, (c) => drawHead(c, fk));
  const bkind = kid ? "kid" : "driver";
  const bkey = `body|${shirt}|${bkind}`;
  const bodyTex = makeTex(bkey, BW, BH, (c) => drawBody(c, shirt, bkind));
  const headMat = cardMatFor(hkey, headTex);
  const bodyMat = cardMatFor(bkey, bodyTex);

  // layout (figure-local units): body card 0.82 x 1.25 centred at origin, head overlaps its top
  const bodyW = 0.82;
  const bodyH = bodyW * (BH / BW);
  const headW = 1.1;
  const headH = headW * (HH / HW);
  const headY = 1.0;
  const sh: [[number, number], [number, number]] = [
    [-0.33, 0.25],
    [0.33, 0.25],
  ];
  const L = limb(sh[0], [q(armL[0]), q(armL[1])], 0.48, 0.45);
  const R = limb(sh[1], [q(armR[0]), q(armR[1])], 0.48, 0.45);
  const legLen = 0.62;
  const LL = limb([-0.17, -0.5], [q(legL[0]), q(legL[1])], legLen, legLen);
  const LR = limb([0.17, -0.5], [q(legR[0]), q(legR[1])], legLen, legLen);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {showBody && (
        <>
          <Noodle a={[-0.17, -0.45]} e={LL.e} b={LL.h} r={0.026} z={-0.01} />
          <Noodle a={[0.17, -0.45]} e={LR.e} b={LR.h} r={0.026} z={-0.01} />
          <mesh geometry={plane} material={bodyMat} scale={[bodyW, bodyH, 1]} position={[0, -0.02, 0]} />
          <Noodle a={sh[0]} e={L.e} b={L.h} r={0.024} z={0.05} />
          <Noodle a={sh[1]} e={R.e} b={R.h} r={0.024} z={0.05} />
          <mesh geometry={ball} material={INK_MAT} position={[L.h[0], L.h[1], 0.05]} scale={0.062} />
          <mesh geometry={ball} material={INK_MAT} position={[R.h[0], R.h[1], 0.05]} scale={0.062} />
        </>
      )}
      <mesh geometry={plane} material={headMat} scale={[headW, headH, 1]} position={[0, headY, 0.03]} />
    </group>
  );
};

/** 2-bone IK in figure-local units. Returns [shoulder, elbow] angles reaching from shoulder to target. */
export const ik = (shoulder: [number, number], target: [number, number], bend = 1, l1 = 0.48, l2 = 0.45): [number, number] => {
  const dx = target[0] - shoulder[0];
  const dy = target[1] - shoulder[1];
  const D = Math.min(l1 + l2 - 1e-3, Math.max(0.05, Math.hypot(dx, dy)));
  const th = Math.atan2(dx, -dy);
  const b = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + D * D - l2 * l2) / (2 * l1 * D))));
  const c = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - D * D) / (2 * l1 * l2))));
  return [th + bend * b, -bend * (Math.PI - c)];
};
export const SHOULDER_L: [number, number] = [-0.33, 0.25];
export const SHOULDER_R: [number, number] = [0.33, 0.25];

/** Camera-facing head (for characters seen through car windows from any angle). */
export const HeadSprite: React.FC<{ expr?: Expr; position?: [number, number, number]; size?: number; hair?: "none" | "kid" | "tuft"; skin?: string; look?: [number, number] }> = ({
  expr = "neutral",
  position = [0, 0, 0],
  size = 0.4,
  hair = "none",
  skin = "#f6f0e6",
  look = [0, 0],
}) => {
  const fk: FaceKey = { expr, mouth: 0, look, blink: false, sweat: false, hair, skin };
  const key = `head|${JSON.stringify(fk)}`;
  const tex = makeTex(key, HW, HH, (c) => drawHead(c, fk));
  return (
    <sprite position={position} scale={[size, size * (HH / HW), 1]}>
      <spriteMaterial map={tex} alphaTest={0.4} />
    </sprite>
  );
};
