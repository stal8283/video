// The prop library: toy-like, real-scale furniture, nature and period props. All painted (toon textures), every
// part a separate simple mesh that only TOUCHES its neighbors (overlapping coplanar faces z-fight and ink a blob).
// Positions are the prop's footprint center on the floor (y = floor height); `yaw` turns it; `s` scales it.
//
// Interior: Table, Chair, Desk, Bookshelf, Bed, Rug, Frame, WallWindow, Door, FloorLamp, DeskLamp, Clock, Plant,
//           Chalkboard, Globe, Candle, Mug, BookStack, Sofa
// Nature:   Tree, PineTree, Bush, Rock, Grass, Fence, Log, Mushroom, Stump
// Period:   Column, Cart, TorchStand, Banner, Well, Amphora, Crate, Barrel, Tent, StoneHouse
import React from "react";
import { boxG, coneG, coreMat, cylG, Flame, Label, M, sphG, torG } from "../core/kit";
import type { V3 } from "../types";

type P = { p: V3; yaw?: number; s?: number };
const G: React.FC<P & { children: React.ReactNode }> = ({ p, yaw = 0, s = 1, children }) => (
  <group position={p} rotation={[0, yaw, 0]} scale={s}>
    {children}
  </group>
);
const h = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ------------------------------------------------------------------ interior
export const Table: React.FC<P & { w?: number; d?: number; color?: string }> = ({ w = 1.4, d = 0.8, color = "#a8723e", ...p }) => (
  <G {...p}>
    <M g={boxG(w, 0.06, d)} c={color} tex="wood" p={[0, 0.75, 0]} />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <M key={`${x}${z}`} g={boxG(0.07, 0.72, 0.07)} c={color} tex="wood" p={[x * (w / 2 - 0.08), 0.36, z * (d / 2 - 0.08)]} />))}
  </G>
);
export const Chair: React.FC<P & { color?: string }> = ({ color = "#8a5a32", ...p }) => (
  <G {...p}>
    <M g={boxG(0.46, 0.05, 0.44)} c={color} tex="wood" p={[0, 0.46, 0]} />
    <M g={boxG(0.46, 0.5, 0.05)} c={color} tex="wood" p={[0, 0.735, -0.2]} />
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <M key={`${x}${z}`} g={boxG(0.05, 0.435, 0.05)} c={color} tex="wood" p={[x * 0.19, 0.2175, z * 0.18]} />))}
  </G>
);
export const Desk: React.FC<P & { color?: string }> = ({ color = "#9a6a3a", ...p }) => (
  <G {...p}>
    <M g={boxG(1.3, 0.05, 0.65)} c={color} tex="wood" p={[0, 0.76, 0]} />
    <M g={boxG(0.42, 0.735, 0.6)} c={color} tex="planks" p={[0.42, 0.3675, 0]} />
    {[0.2, 0.45].map((y) => (
      <M key={y} g={boxG(0.3, 0.02, 0.02)} c="#d8b878" p={[0.42, y + 0.15, 0.31]} />
    ))}
    {[-1].flatMap((x) => [-1, 1].map((z) => <M key={z} g={boxG(0.06, 0.735, 0.06)} c={color} tex="wood" p={[x * 0.6, 0.3675, z * 0.27]} />))}
  </G>
);
const BOOK_COLORS = ["#b0503c", "#3d5fbf", "#d6a137", "#2e8a86", "#7c9868", "#c46a78", "#6b4b3b"];
export const BookStack: React.FC<P & { n?: number; seed?: number }> = ({ n = 4, seed = 1, ...p }) => (
  <G {...p}>
    {Array.from({ length: n }, (_, i) => (
      <M key={i} g={boxG(0.22 - h(i + seed) * 0.05, 0.045, 0.16)} c={BOOK_COLORS[(i + seed) % BOOK_COLORS.length]} p={[0, 0.0225 + i * 0.046, 0]} r={[0, (h(i * 3 + seed) - 0.5) * 0.4, 0]} />
    ))}
  </G>
);
export const Bookshelf: React.FC<P & { w?: number; hgt?: number; color?: string; seed?: number }> = ({ w = 1.2, hgt = 1.9, color = "#7a4a2a", seed = 3, ...p }) => {
  const shelves = 4;
  return (
    <G {...p}>
      <M g={boxG(w, hgt, 0.04)} c={color} tex="planks" p={[0, hgt / 2, -0.16]} />
      {[-1, 1].map((x) => (
        <M key={x} g={boxG(0.04, hgt, 0.34)} c={color} tex="wood" p={[x * (w / 2 - 0.02), hgt / 2, 0.01]} />
      ))}
      {Array.from({ length: shelves + 1 }, (_, i) => (
        <M key={i} g={boxG(w - 0.08, 0.03, 0.3)} c={color} tex="wood" p={[0, 0.06 + (i * (hgt - 0.1)) / shelves, 0.01]} />
      ))}
      {Array.from({ length: shelves }, (_, r) => {
        let x = -w / 2 + 0.08;
        const books: React.ReactNode[] = [];
        let k = 0;
        while (x < w / 2 - 0.14) {
          const bw = 0.035 + h(r * 31 + k + seed) * 0.03;
          const bh = 0.2 + h(r * 17 + k * 3 + seed) * 0.12;
          const tilt = h(k * 7 + r + seed) > 0.9 ? 0.18 : 0;
          books.push(<M key={k} g={boxG(bw, bh, 0.2)} c={BOOK_COLORS[(r * 3 + k + seed) % BOOK_COLORS.length]} p={[x + bw / 2, 0.075 + (r * (hgt - 0.1)) / shelves + bh / 2, 0.02]} r={[0, 0, tilt]} />);
          x += bw + 0.004;
          k++;
          if (h(r * 13 + k + seed) > 0.86) x += 0.08;
        }
        return <group key={r}>{books}</group>;
      })}
    </G>
  );
};
export const Bed: React.FC<P & { color?: string; sheet?: string }> = ({ color = "#8a5a32", sheet = "#c8d8f0", ...p }) => (
  <G {...p}>
    <M g={boxG(1.1, 0.3, 2.0)} c={color} tex="wood" p={[0, 0.25, 0]} />
    <M g={boxG(1.04, 0.18, 1.94)} c="#f4ecdc" tex="fabric" p={[0, 0.49, 0]} />
    <M g={boxG(1.06, 0.06, 1.4)} c={sheet} tex="fabric" p={[0, 0.61, 0.28]} />
    <M g={boxG(0.7, 0.14, 0.36)} c="#f8f2e6" tex="fabric" p={[0, 0.65, -0.72]} />
    <M g={boxG(1.1, 0.9, 0.06)} c={color} tex="planks" p={[0, 0.45, -1.03]} />
  </G>
);
export const Sofa: React.FC<P & { color?: string }> = ({ color = "#c46a58", ...p }) => (
  <G {...p}>
    <M g={boxG(1.9, 0.42, 0.85)} c={color} tex="fabric" p={[0, 0.21, 0]} />
    <M g={boxG(1.9, 0.5, 0.22)} c={color} tex="fabric" p={[0, 0.67, -0.32]} />
    {[-1, 1].map((x) => (
      <M key={x} g={boxG(0.22, 0.3, 0.85)} c={color} tex="fabric" p={[x * 0.84, 0.57, 0]} />
    ))}
    {[-0.4, 0.4].map((x) => (
      <M key={x} g={boxG(0.7, 0.1, 0.6)} c="#e8a080" tex="fabric" p={[x, 0.47, 0.06]} />
    ))}
  </G>
);
export const Rug: React.FC<P & { w?: number; d?: number; color?: string; border?: string }> = ({ w = 2.2, d = 1.5, color = "#a84a3a", border = "#e8c87a", ...p }) => (
  <G {...p}>
    <M g={boxG(w, 0.012, d)} c={border} tex="fabric" p={[0, 0.006, 0]} cast={false} />
    <M g={boxG(w - 0.2, 0.014, d - 0.2)} c={color} tex="fabric" p={[0, 0.013, 0]} cast={false} />
  </G>
);
/** a picture frame on a wall (place it 2–4 mm in front of the wall) */
export const Frame: React.FC<P & { w?: number; hgt?: number; art?: string; frame?: string }> = ({ w = 0.6, hgt = 0.45, art = "#7aa0c8", frame = "#c99f4b", ...p }) => (
  <G {...p}>
    <M g={boxG(w, hgt, 0.03)} c={frame} tex="wood" p={[0, 0, 0.015]} />
    <M g={boxG(w - 0.08, hgt - 0.08, 0.004)} c={art} tex="paper" p={[0, 0, 0.032]} />
    <M g={sphG(Math.min(w, hgt) * 0.12, 12)} c="#f0d070" p={[w * 0.18, hgt * 0.12, 0.036]} s={[1, 1, 0.2]} />
  </G>
);
/** an interior window set into a wall (place it on the wall's surface); `sky` is what shows through */
export const WallWindow: React.FC<P & { w?: number; hgt?: number; sky?: string; lit?: number }> = ({ w = 1.1, hgt = 1.3, sky = "#9ac8f0", lit = 1.0, ...p }) => (
  <G {...p}>
    <mesh geometry={boxG(w, hgt, 0.01)} material={coreMat(sky, lit)} position={[0, 0, 0.005]} />
    <M g={boxG(w + 0.12, 0.07, 0.08)} c="#f2ead8" p={[0, hgt / 2 + 0.035, 0.04]} />
    <M g={boxG(w + 0.12, 0.07, 0.08)} c="#f2ead8" p={[0, -hgt / 2 - 0.035, 0.04]} />
    <M g={boxG(0.07, hgt, 0.08)} c="#f2ead8" p={[-w / 2 - 0.025, 0, 0.04]} />
    <M g={boxG(0.07, hgt, 0.08)} c="#f2ead8" p={[w / 2 + 0.025, 0, 0.04]} />
    <M g={boxG(0.04, hgt, 0.05)} c="#f2ead8" p={[0, 0, 0.03]} />
    <M g={boxG(w + 0.3, 0.05, 0.2)} c="#e0d4bc" p={[0, -hgt / 2 - 0.095, 0.1]} />
  </G>
);
export const Door: React.FC<P & { color?: string; open?: number }> = ({ color = "#7a4a2a", open = 0, ...p }) => (
  <G {...p}>
    <M g={boxG(1.06, 0.08, 0.1)} c="#e8dcc8" p={[0, 2.14, 0.05]} />
    <group position={[-0.45, 0, 0.03]} rotation={[0, -open * 1.4, 0]}>
      <M g={boxG(0.9, 2.08, 0.05)} c={color} tex="planks" p={[0.45, 1.04, 0]} />
      <M g={sphG(0.035, 12)} c="#c99f4b" p={[0.82, 1.0, 0.05]} />
    </group>
  </G>
);
export const FloorLamp: React.FC<P & { on?: number }> = ({ on = 1, ...p }) => (
  <G {...p}>
    <M g={cylG(0.18, 0.2, 0.04, 20)} c="#3a3a44" tex="metal" p={[0, 0.02, 0]} />
    <M g={cylG(0.02, 0.02, 1.5, 10)} c="#3a3a44" tex="metal" p={[0, 0.79, 0]} />
    <M g={cylG(0.16, 0.26, 0.3, 24, true)} c="#f0d8a8" tex="fabric" p={[0, 1.6, 0]} side={2} />
    <mesh geometry={sphG(0.07, 12)} material={coreMat("#ffe0a0", 0.6 + 0.5 * on)} position={[0, 1.55, 0]} />
    <pointLight position={[0, 1.5, 0]} color="#ffb860" intensity={5 * on} distance={6} decay={2} />
  </G>
);
export const DeskLamp: React.FC<P & { on?: number }> = ({ on = 1, ...p }) => (
  <G {...p}>
    <M g={cylG(0.08, 0.09, 0.03, 16)} c="#2e8a86" tex="metal" p={[0, 0.015, 0]} />
    <M g={cylG(0.012, 0.012, 0.32, 8)} c="#2e8a86" tex="metal" p={[0, 0.17, 0]} r={[0, 0, 0.25]} />
    <M g={coneG(0.1, 0.12, 20)} c="#2e8a86" tex="metal" p={[-0.06, 0.34, 0]} r={[0, 0, 2.4]} />
    <mesh geometry={sphG(0.03, 10)} material={coreMat("#fff0c0", 0.6 + 0.6 * on)} position={[-0.09, 0.3, 0]} />
    <pointLight position={[-0.1, 0.27, 0]} color="#ffc070" intensity={2.5 * on} distance={3} decay={2} />
  </G>
);
/** a wall clock showing `hour` (0–12, fractional ok) */
export const Clock: React.FC<P & { hour?: number }> = ({ hour = 3, ...p }) => {
  const a = (hour / 12) * Math.PI * 2;
  const m = ((hour % 1) * 60 / 60) * Math.PI * 2;
  return (
    <G {...p}>
      <M g={cylG(0.2, 0.2, 0.05, 32)} c="#7a4a2a" tex="wood" p={[0, 0, 0.025]} r={[Math.PI / 2, 0, 0]} />
      <M g={cylG(0.17, 0.17, 0.006, 32)} c="#f6efe0" p={[0, 0, 0.053]} r={[Math.PI / 2, 0, 0]} />
      <M g={boxG(0.018, 0.1, 0.005)} c="#1a1416" p={[Math.sin(a) * 0.05, Math.cos(a) * 0.05, 0.06]} r={[0, 0, -a]} />
      <M g={boxG(0.012, 0.14, 0.005)} c="#1a1416" p={[Math.sin(m) * 0.07, Math.cos(m) * 0.07, 0.064]} r={[0, 0, -m]} />
    </G>
  );
};
export const Plant: React.FC<P & { color?: string; pot?: string }> = ({ color = "#4a9a4a", pot = "#c8643a", ...p }) => (
  <G {...p}>
    <M g={cylG(0.16, 0.12, 0.3, 18)} c={pot} tex="plaster" p={[0, 0.15, 0]} />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <M key={i} g={sphG(0.11 + h(i) * 0.05, 12)} c={i % 2 ? color : "#5aaa4a"} p={[Math.cos(i * 1.05) * 0.1, 0.4 + h(i * 3) * 0.2, Math.sin(i * 1.05) * 0.1]} s={[1, 1.3, 1]} />
    ))}
  </G>
);
/** a chalkboard with one painted tag (sound-off readability: 1–3 words) */
export const Chalkboard: React.FC<P & { text?: string; w?: number }> = ({ text = "", w = 2.4, ...p }) => (
  <G {...p}>
    <M g={boxG(w + 0.12, 1.32, 0.05)} c="#8a5a32" tex="wood" p={[0, 1.55, 0.025]} />
    <M g={boxG(w, 1.2, 0.012)} c="#2a4a3a" p={[0, 1.55, 0.056]} />
    <M g={boxG(w, 0.04, 0.1)} c="#8a5a32" tex="wood" p={[0, 0.93, 0.1]} />
    {text ? <Label text={text} p={[0, 1.6, 0.064]} w={w * 0.8} h={0.42} fg="#f4f0e4" bg="none" font={0.7} /> : null}
  </G>
);
export const Globe: React.FC<P & { t?: number }> = ({ t = 0, ...p }) => (
  <G {...p}>
    <M g={cylG(0.08, 0.1, 0.03, 16)} c="#7a4a2a" tex="wood" p={[0, 0.015, 0]} />
    <M g={cylG(0.012, 0.012, 0.12, 8)} c="#c99f4b" tex="metal" p={[0, 0.09, 0]} />
    <group position={[0, 0.3, 0]} rotation={[0, t * 0.6, 0.4]}>
      <M g={sphG(0.16, 24)} c="#3d7fbf" p={[0, 0, 0]} />
      {[0, 1, 2].map((i) => (
        <M key={i} g={sphG(0.07, 10)} c="#7cb85a" p={[Math.cos(i * 2.1) * 0.12, (i - 1) * 0.06, Math.sin(i * 2.1) * 0.12]} s={[1, 0.6, 0.4]} />
      ))}
      <M g={torG(0.18, 0.008, Math.PI)} c="#c99f4b" p={[0, 0, 0]} r={[0, 0, Math.PI / 2]} />
    </group>
  </G>
);
export const Candle: React.FC<P & { t: number }> = ({ t, ...p }) => (
  <G {...p}>
    <M g={cylG(0.03, 0.03, 0.16, 14)} c="#f4ecd8" p={[0, 0.08, 0]} />
    <Flame p={[0, 0.16, 0]} s={0.05} t={t} />
  </G>
);
export const Mug: React.FC<P & { color?: string }> = ({ color = "#e8dcc8", ...p }) => (
  <G {...p}>
    <M g={cylG(0.045, 0.04, 0.1, 18)} c={color} p={[0, 0.05, 0]} />
    <M g={torG(0.025, 0.007, Math.PI * 1.2)} c={color} p={[0.05, 0.05, 0]} r={[0, 0, -1.9]} />
  </G>
);

// ------------------------------------------------------------------ nature
/** a cartoon broadleaf tree: a tapered trunk and 4–6 overlapping round canopy lobes */
export const Tree: React.FC<P & { leaf?: string; seed?: number; hgt?: number }> = ({ leaf = "#4a9a3a", seed = 1, hgt = 4.2, ...p }) => (
  <G {...p}>
    <M g={cylG(0.14, 0.24, hgt * 0.55, 12)} c="#7a5032" tex="wood" p={[0, hgt * 0.275, 0]} />
    {Array.from({ length: 5 }, (_, i) => {
      const a = i * 1.26 + seed;
      const r = 0.9 + h(i + seed) * 0.5;
      return <M key={i} g={sphG(r, 16)} c={i % 2 ? leaf : "#5aaa48"} tex="grass" p={[Math.cos(a) * 0.6, hgt * 0.62 + h(i * 3 + seed) * 0.9, Math.sin(a) * 0.6]} />;
    })}
    <M g={sphG(1.0, 16)} c={leaf} tex="grass" p={[0, hgt * 0.85, 0]} />
  </G>
);
export const PineTree: React.FC<P & { leaf?: string; hgt?: number }> = ({ leaf = "#2e6a4a", hgt = 5, ...p }) => (
  <G {...p}>
    <M g={cylG(0.12, 0.18, hgt * 0.3, 10)} c="#6a4428" tex="wood" p={[0, hgt * 0.15, 0]} />
    {[0, 1, 2].map((i) => (
      <M key={i} g={coneG(1.3 - i * 0.32, hgt * 0.34, 14)} c={i % 2 ? leaf : "#357a52"} tex="grass" p={[0, hgt * (0.38 + i * 0.2), 0]} />
    ))}
  </G>
);
export const Bush: React.FC<P & { color?: string }> = ({ color = "#4a8a3a", ...p }) => (
  <G {...p}>
    {[0, 1, 2].map((i) => (
      <M key={i} g={sphG(0.4 + i * 0.06, 14)} c={i % 2 ? color : "#5a9a48"} tex="grass" p={[(i - 1) * 0.42, 0.32, (i % 2) * 0.1]} s={[1, 0.85, 1]} />
    ))}
  </G>
);
export const Rock: React.FC<P & { color?: string; seed?: number }> = ({ color = "#8a8a94", seed = 1, ...p }) => (
  <G {...p}>
    <M g={sphG(0.5, 7)} c={color} tex="rock" p={[0, 0.22, 0]} s={[1.2 + h(seed) * 0.4, 0.7, 1 + h(seed * 2) * 0.3]} r={[0, h(seed * 3) * 3, 0]} />
  </G>
);
/** grass tufts scattered over an area (w × d), deterministic: each tuft is 3 short leaning blades, never spikes */
export const Grass: React.FC<P & { w?: number; d?: number; n?: number; color?: string }> = ({ w = 4, d = 4, n = 30, color = "#5aa048", ...p }) => (
  <G {...p}>
    {Array.from({ length: n }, (_, i) => {
      const x = (h(i * 2.1) - 0.5) * w;
      const z = (h(i * 3.7) - 0.5) * d;
      return (
        <group key={i} position={[x, 0, z]} rotation={[0, h(i * 9) * 6, 0]}>
          {[-1, 0, 1].map((k) => (
            <M key={k} g={coneG(0.022, 0.13 + (k === 0 ? 0.04 : 0), 4)} c={k ? color : "#6ab858"} p={[k * 0.03, 0.065, 0]} r={[0, 0, -k * 0.45]} s={[1, 1, 0.45]} cast={false} />
          ))}
        </group>
      );
    })}
  </G>
);
export const Fence: React.FC<P & { len?: number; color?: string }> = ({ len = 4, color = "#e8dcc0", ...p }) => {
  const n = Math.max(2, Math.round(len / 0.5));
  return (
    <G {...p}>
      {Array.from({ length: n + 1 }, (_, i) => (
        <M key={i} g={boxG(0.08, 0.9, 0.06)} c={color} tex="planks" p={[-len / 2 + (i * len) / n, 0.45, 0]} />
      ))}
      {[0.3, 0.7].map((y) => (
        <M key={y} g={boxG(len + 0.1, 0.08, 0.04)} c={color} tex="planks" p={[0, y, 0.05]} />
      ))}
    </G>
  );
};
export const Log: React.FC<P> = (p) => (
  <G {...p}>
    <M g={cylG(0.22, 0.24, 1.6, 14)} c="#7a5032" tex="wood" p={[0, 0.23, 0]} r={[0, 0, Math.PI / 2]} />
  </G>
);
export const Stump: React.FC<P> = (p) => (
  <G {...p}>
    <M g={cylG(0.32, 0.38, 0.45, 14)} c="#7a5032" tex="wood" p={[0, 0.225, 0]} />
    <M g={cylG(0.3, 0.3, 0.01, 14)} c="#d8b080" p={[0, 0.455, 0]} />
  </G>
);
export const Mushroom: React.FC<P & { color?: string }> = ({ color = "#d83a2a", ...p }) => (
  <G {...p}>
    <M g={cylG(0.04, 0.05, 0.16, 10)} c="#f4ecd8" p={[0, 0.08, 0]} />
    <M g={sphG(0.11, 14)} c={color} p={[0, 0.17, 0]} s={[1, 0.6, 1]} />
  </G>
);

// ------------------------------------------------------------------ period / history
export const Column: React.FC<P & { hgt?: number; color?: string }> = ({ hgt = 4, color = "#e8dcc4", ...p }) => (
  <G {...p}>
    <M g={boxG(0.8, 0.2, 0.8)} c={color} tex="stone" p={[0, 0.1, 0]} />
    <M g={cylG(0.28, 0.32, hgt - 0.4, 20)} c={color} tex="plaster" p={[0, hgt / 2, 0]} />
    <M g={boxG(0.8, 0.2, 0.8)} c={color} tex="stone" p={[0, hgt - 0.1, 0]} />
  </G>
);
export const Cart: React.FC<P & { color?: string; load?: boolean }> = ({ color = "#9a6a3a", load = true, ...p }) => (
  <G {...p}>
    <M g={boxG(1.6, 0.4, 1.0)} c={color} tex="planks" p={[0, 0.75, 0]} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <M g={cylG(0.45, 0.45, 0.08, 20)} c="#6a4428" tex="wood" p={[0, 0.45, s * 0.56]} r={[Math.PI / 2, 0, 0]} />
        <M g={cylG(0.1, 0.1, 0.1, 12)} c="#3a3a44" tex="metal" p={[0, 0.45, s * 0.58]} r={[Math.PI / 2, 0, 0]} />
      </group>
    ))}
    <M g={boxG(1.4, 0.05, 0.06)} c="#6a4428" tex="wood" p={[1.4, 0.68, 0.3]} r={[0, 0, -0.15]} />
    <M g={boxG(1.4, 0.05, 0.06)} c="#6a4428" tex="wood" p={[1.4, 0.68, -0.3]} r={[0, 0, -0.15]} />
    {load
      ? [0, 1, 2, 3].map((i) => <M key={i} g={sphG(0.18, 12)} c={i % 2 ? "#d8a03a" : "#c8502a"} p={[-0.4 + i * 0.27, 1.05, (i % 2) * 0.2 - 0.1]} />)
      : null}
  </G>
);
export const TorchStand: React.FC<P & { t: number; on?: number }> = ({ t, on = 1, ...p }) => (
  <G {...p}>
    <M g={cylG(0.05, 0.07, 1.6, 10)} c="#4a3a2a" tex="wood" p={[0, 0.8, 0]} />
    <M g={cylG(0.12, 0.07, 0.16, 12)} c="#3a3a44" tex="metal" p={[0, 1.66, 0]} />
    {on > 0 ? (
      <>
        <Flame p={[0, 1.72, 0]} s={0.22} t={t} />
        <pointLight position={[0, 2.0, 0]} color="#ff9a40" intensity={7 * on} distance={7} decay={2} />
      </>
    ) : null}
  </G>
);
/** a hanging banner with a 1–3 word painted tag (a year, a place) */
export const Banner: React.FC<P & { text?: string; color?: string; w?: number }> = ({ text = "", color = "#a02a2a", w = 0.9, ...p }) => (
  <G {...p}>
    <M g={cylG(0.02, 0.02, w + 0.2, 8)} c="#6a4428" tex="wood" p={[0, 0, 0.02]} r={[0, 0, Math.PI / 2]} />
    <M g={boxG(w, 1.4, 0.02)} c={color} tex="fabric" p={[0, -0.72, 0.04]} />
    {text ? <Label text={text} p={[0, -0.6, 0.052]} w={w * 0.86} h={0.36} fg="#f4e2a0" bg="none" font={0.75} /> : null}
  </G>
);
export const Well: React.FC<P> = (p) => (
  <G {...p}>
    <M g={cylG(0.7, 0.75, 0.8, 20, true)} c="#9a9aa4" tex="stone" p={[0, 0.4, 0]} side={2} />
    <M g={cylG(0.6, 0.6, 0.02, 20)} c="#1a2a4a" p={[0, 0.5, 0]} />
    {[-1, 1].map((s) => (
      <M key={s} g={boxG(0.1, 1.5, 0.1)} c="#6a4428" tex="wood" p={[s * 0.7, 1.15, 0]} />
    ))}
    <M g={coneG(1.1, 0.6, 4)} c="#9a4a3a" tex="roofTiles" p={[0, 2.2, 0]} r={[0, Math.PI / 4, 0]} />
  </G>
);
export const Amphora: React.FC<P & { color?: string }> = ({ color = "#c8703a", ...p }) => (
  <G {...p}>
    <M g={sphG(0.22, 16)} c={color} tex="plaster" p={[0, 0.3, 0]} s={[1, 1.3, 1]} />
    <M g={cylG(0.07, 0.1, 0.18, 12)} c={color} tex="plaster" p={[0, 0.65, 0]} />
  </G>
);
export const Crate: React.FC<P> = (p) => (
  <G {...p}>
    <M g={boxG(0.6, 0.6, 0.6)} c="#c8945a" tex="planks" p={[0, 0.3, 0]} />
    <M g={boxG(0.62, 0.06, 0.62)} c="#8a5a32" p={[0, 0.5, 0]} />
    <M g={boxG(0.62, 0.06, 0.62)} c="#8a5a32" p={[0, 0.1, 0]} />
  </G>
);
export const Barrel: React.FC<P> = (p) => (
  <G {...p}>
    <M g={cylG(0.32, 0.3, 0.9, 20)} c="#b8743a" tex="wood" p={[0, 0.45, 0]} />
    {[0.15, 0.75].map((y) => (
      <M key={y} g={cylG(0.335, 0.335, 0.05, 20)} c="#4a4a52" tex="metal" p={[0, y, 0]} />
    ))}
  </G>
);
export const Tent: React.FC<P & { color?: string }> = ({ color = "#e8d8b0", ...p }) => (
  <G {...p}>
    <M g={coneG(1.6, 2.4, 4)} c={color} tex="fabric" p={[0, 1.2, 0]} r={[0, Math.PI / 4, 0]} />
    <M g={boxG(0.7, 1.2, 0.02)} c="#3a2a24" p={[0, 0.6, 1.14]} />
  </G>
);
/** an old stone house (history sets): stone walls, a timber band, a tiled roof, small deep windows */
export const StoneHouse: React.FC<P & { w?: number; hgt?: number; d?: number; wall?: string; roof?: string; lit?: boolean }> = ({ w = 4.5, hgt = 4.2, d = 4, wall = "#c8b89a", roof = "#8a4a3a", lit = false, ...p }) => (
  <G {...p}>
    <M g={boxG(w, hgt, d)} c={wall} tex="stone" p={[0, hgt / 2, 0]} />
    <M g={boxG(w + 0.04, 0.16, d + 0.04)} c="#6a4428" tex="wood" p={[0, hgt * 0.55, 0]} />
    {[-1, 1].map((s) => (
      <M key={s} g={boxG(w + 0.5, 0.12, d * 0.62)} c={roof} tex="roofTiles" p={[0, hgt + d * 0.17, s * d * 0.25]} r={[s * 0.6, 0, 0]} />
    ))}
    {[-1, 1].map((s) => (
      <group key={s} position={[s * w * 0.25, hgt * 0.75, d / 2 + 0.011]}>
        <mesh geometry={boxG(0.6, 0.8, 0.02)} material={coreMat(lit ? "#ffc070" : "#2a3050", lit ? 1.0 : 0.8)} />
        <M g={boxG(0.74, 0.08, 0.12)} c="#6a4428" tex="wood" p={[0, -0.44, 0.04]} />
      </group>
    ))}
    <M g={boxG(1.0, 1.9, 0.08)} c="#5a3a2a" tex="planks" p={[0, 0.95, d / 2 + 0.04]} />
    <M g={boxG(1.2, 0.14, 0.14)} c="#6a4428" tex="wood" p={[0, 1.97, d / 2 + 0.07]} />
  </G>
);
