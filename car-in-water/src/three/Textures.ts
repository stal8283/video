import * as THREE from "three";
import { rand } from "./util";

/** Procedural canvas textures (cached). Everything here is drawn in code: no image assets. */
const cache = new Map<string, THREE.Texture>();
const canvasTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1], srgb = true) => {
  const k = `${key}|${repeat}`;
  let t = cache.get(k);
  if (t) return t;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!);
  t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  cache.set(k, t);
  return t;
};

const speckle = (c: CanvasRenderingContext2D, w: number, h: number, n: number, a: number, seed = 1, light = false) => {
  for (let i = 0; i < n; i++) {
    c.fillStyle = light ? `rgba(255,255,255,${a * rand(i * 3 + seed)})` : `rgba(0,0,0,${a * rand(i * 3 + seed)})`;
    const s = 1 + rand(i * 7 + seed) * 3;
    c.fillRect(rand(i * 11 + seed) * w, rand(i * 13 + seed) * h, s, s);
  }
};

export const concreteTex = (repeat: [number, number] = [4, 1], tint = "#7d858c") =>
  canvasTex(`concrete${tint}`, 512, 512, (c) => {
    c.fillStyle = tint;
    c.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `rgba(${rand(i) > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + rand(i * 3) * 0.05})`;
      c.beginPath();
      c.ellipse(rand(i * 5) * 512, rand(i * 7) * 512, 30 + rand(i * 9) * 90, 20 + rand(i * 2) * 60, rand(i) * 3, 0, Math.PI * 2);
      c.fill();
    }
    speckle(c, 512, 512, 3000, 0.25);
    // panel joints + water stains
    c.strokeStyle = "rgba(0,0,0,0.35)";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(256, 0);
    c.lineTo(256, 512);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      const x = rand(i * 17) * 512;
      const g = c.createLinearGradient(x, 0, x, 300);
      g.addColorStop(0, "rgba(20,25,30,0.25)");
      g.addColorStop(1, "rgba(20,25,30,0)");
      c.fillStyle = g;
      c.fillRect(x, 0, 10 + rand(i) * 20, 300);
    }
  }, repeat);

export const asphaltTex = (repeat: [number, number] = [20, 2]) =>
  canvasTex("asphalt", 512, 512, (c) => {
    c.fillStyle = "#2a2d33";
    c.fillRect(0, 0, 512, 512);
    speckle(c, 512, 512, 9000, 0.35);
    speckle(c, 512, 512, 2500, 0.12, 5, true);
    // wet patches (lighter, reflective look)
    for (let i = 0; i < 14; i++) {
      c.fillStyle = `rgba(120,140,170,${0.05 + rand(i) * 0.07})`;
      c.beginPath();
      c.ellipse(rand(i * 5) * 512, rand(i * 7) * 512, 40 + rand(i * 9) * 80, 12 + rand(i) * 20, 0, 0, Math.PI * 2);
      c.fill();
    }
  }, repeat);

export const brickTex = (repeat: [number, number] = [2, 2], color = "#8a4b3b") =>
  canvasTex(`brick${color}`, 512, 512, (c) => {
    c.fillStyle = "#3b302c";
    c.fillRect(0, 0, 512, 512);
    const bw = 64;
    const bh = 28;
    const base = new THREE.Color(color);
    for (let r = 0; r < 512 / bh + 1; r++) {
      for (let k = -1; k < 512 / bw + 1; k++) {
        const x = k * bw + (r % 2) * (bw / 2);
        const y = r * bh;
        const v = 0.8 + rand(r * 31 + k) * 0.35;
        c.fillStyle = base.clone().multiplyScalar(v).getStyle();
        c.fillRect(x + 3, y + 3, bw - 6, bh - 6);
      }
    }
    speckle(c, 512, 512, 3000, 0.2);
  }, repeat);

/** Night facade: grid of windows, some lit warm/cool, with sills + floor bands. Returns [map, emissiveMap]. */
export const facadeTex = (seed: number, cols = 6, rows = 12, wall = "#3a4658") => {
  const lit = (i: number) => rand(i * 13 + seed) > 0.55;
  const warm = (i: number) => rand(i * 7 + seed) > 0.35;
  const draw = (emit: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = emit ? "#000" : wall;
    c.fillRect(0, 0, 256, 512);
    if (!emit) {
      speckle(c, 256, 512, 1200, 0.18, seed);
      c.fillStyle = "rgba(255,255,255,0.06)";
      for (let r = 0; r < rows; r++) c.fillRect(0, (r * 512) / rows, 256, 3);
    }
    const cw = 256 / cols;
    const rh = 512 / rows;
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < cols; k++) {
        const i = r * cols + k;
        const x = k * cw + cw * 0.18;
        const y = r * rh + rh * 0.22;
        const w = cw * 0.64;
        const h = rh * 0.56;
        if (emit) {
          if (!lit(i)) continue;
          const g = c.createLinearGradient(x, y, x, y + h);
          g.addColorStop(0, warm(i) ? "#ffd9a0" : "#bfe0ff");
          g.addColorStop(1, warm(i) ? "#ff9e4a" : "#6fa6ff");
          c.fillStyle = g;
          c.fillRect(x, y, w, h);
          // curtain / silhouette
          if (rand(i * 3 + seed) > 0.6) {
            c.fillStyle = "rgba(0,0,0,0.45)";
            c.fillRect(x + w * rand(i + seed) * 0.6, y, w * 0.3, h);
          }
        } else {
          c.fillStyle = lit(i) ? (warm(i) ? "#f6c37e" : "#9cc6ff") : "#1b2433";
          c.fillRect(x, y, w, h);
          c.fillStyle = "rgba(255,255,255,0.12)";
          c.fillRect(x, y, w, 3);
          c.fillStyle = "rgba(0,0,0,0.35)";
          c.fillRect(x - 2, y + h, w + 4, 4);
          c.fillRect(x + w / 2 - 1, y, 2, h);
        }
      }
  };
  return [canvasTex(`fac${seed}${cols}${rows}${wall}`, 256, 512, draw(false)), canvasTex(`face${seed}${cols}${rows}`, 256, 512, draw(true))] as const;
};

/** Soft round glow (for lamp halos / bloom-ish sprites). */
export const glowTex = () =>
  canvasTex("glow", 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.15, "rgba(255,255,255,0.65)");
    g.addColorStop(0.45, "rgba(255,255,255,0.15)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

export const fabricTex = (color = "#2f3846", repeat: [number, number] = [3, 3]) =>
  canvasTex(`fabric${color}`, 256, 256, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      c.fillStyle = `rgba(255,255,255,${0.025 + (y % 8 ? 0 : 0.02)})`;
      c.fillRect(0, y, 256, 2);
    }
    for (let x = 0; x < 256; x += 4) {
      c.fillStyle = "rgba(0,0,0,0.05)";
      c.fillRect(x, 0, 2, 256);
    }
    speckle(c, 256, 256, 800, 0.15);
  }, repeat);

export const plasticTex = (color = "#20262e") =>
  canvasTex(`plastic${color}`, 256, 256, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, 256, 256);
    speckle(c, 256, 256, 2500, 0.12);
    speckle(c, 256, 256, 600, 0.06, 3, true);
  }, [2, 2]);

/** Dashboard instrument cluster face. */
export const gaugeTex = () =>
  canvasTex("gauge", 512, 192, (c) => {
    c.fillStyle = "#07090c";
    c.fillRect(0, 0, 512, 192);
    for (const [cx, label] of [
      [128, "km/h"],
      [384, "rpm"],
    ] as [number, string][]) {
      c.strokeStyle = "#ff9a3c";
      c.lineWidth = 6;
      c.beginPath();
      c.arc(cx, 110, 74, Math.PI * 0.8, Math.PI * 2.2);
      c.stroke();
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.8 + (i / 10) * Math.PI * 1.4;
        c.lineWidth = i % 5 ? 3 : 5;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * 62, 110 + Math.sin(a) * 62);
        c.lineTo(cx + Math.cos(a) * 72, 110 + Math.sin(a) * 72);
        c.stroke();
      }
      c.strokeStyle = "#ff4b2b";
      c.lineWidth = 5;
      const a = Math.PI * (label === "rpm" ? 1.3 : 1.55);
      c.beginPath();
      c.moveTo(cx, 110);
      c.lineTo(cx + Math.cos(a) * 64, 110 + Math.sin(a) * 64);
      c.stroke();
      c.fillStyle = "#ffb070";
      c.font = "bold 22px sans-serif";
      c.textAlign = "center";
      c.fillText(label, cx, 160);
    }
  });

/** Moon disc with craters. */
export const moonTex = () =>
  canvasTex("moon", 256, 256, (c) => {
    const g = c.createRadialGradient(110, 110, 10, 128, 128, 120);
    g.addColorStop(0, "#fffbe8");
    g.addColorStop(1, "#d9dccb");
    c.fillStyle = g;
    c.beginPath();
    c.arc(128, 128, 118, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 14; i++) {
      c.fillStyle = "rgba(150,150,130,0.25)";
      c.beginPath();
      c.arc(40 + rand(i) * 176, 40 + rand(i * 3) * 176, 6 + rand(i * 5) * 18, 0, Math.PI * 2);
      c.fill();
    }
  });

/** Soft cloud puff sprite. */
export const cloudTex = () =>
  canvasTex("cloud", 512, 256, (c) => {
    for (let i = 0; i < 22; i++) {
      const x = 80 + rand(i) * 350;
      const y = 110 + (rand(i * 3) - 0.5) * 70;
      const r = 40 + rand(i * 5) * 60;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
  });

export const woodTex = () =>
  canvasTex("wood", 256, 256, (c) => {
    c.fillStyle = "#6b4a32";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      c.strokeStyle = `rgba(30,15,5,${0.1 + rand(i) * 0.2})`;
      c.lineWidth = 1 + rand(i * 3) * 3;
      c.beginPath();
      const y = rand(i * 5) * 256;
      c.moveTo(0, y);
      c.bezierCurveTo(80, y + 8, 170, y - 8, 256, y + 4);
      c.stroke();
    }
  }, [2, 2]);
