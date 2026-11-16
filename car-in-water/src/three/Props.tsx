import { useMemo } from "react";
import * as THREE from "three";
import { FONT, rand, useTextTexture } from "./util";

/** Camera-facing text label (canvas texture on a plane). */
export const Label: React.FC<{
  text: string;
  sub?: string;
  position: [number, number, number];
  scale?: number;
  color?: string;
  bg?: string;
  opacity?: number;
  bubble?: boolean;
  rotation?: [number, number, number];
}> = ({ text, sub, position, scale = 1, color = "#111", bg = "#ffffff", opacity = 1, bubble = false, rotation = [0, 0, 0] }) => {
  const tex = useTextTexture(
    (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 14;
      const r = 70;
      const bh = bubble ? h - 90 : h - 20;
      ctx.beginPath();
      ctx.roundRect(10, 10, w - 20, bh - 10, r);
      if (bubble) {
        ctx.moveTo(w * 0.3, bh);
        ctx.lineTo(w * 0.22, h - 8);
        ctx.lineTo(w * 0.42, bh);
      }
      ctx.fill();
      ctx.stroke();
      if (bubble) {
        ctx.fillStyle = bg;
        ctx.fillRect(w * 0.3 + 4, bh - 16, w * 0.12 - 8, 20);
      }
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `900 ${sub ? 130 : 150}px ${FONT}`;
      ctx.fillText(text, w / 2, sub ? bh * 0.4 : bh / 2 + 6, w - 60);
      if (sub) {
        ctx.font = `700 70px ${FONT}`;
        ctx.fillText(sub, w / 2, bh * 0.75, w - 60);
      }
    },
    1024,
    bubble ? 470 : 380,
    [text, sub, color, bg, bubble],
  );
  const aspect = (bubble ? 470 : 380) / 1024;
  return (
    <mesh position={position} rotation={rotation} scale={[scale, scale * aspect, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

/** Big chrome stopwatch, face toward +Z. progress 0..1 = hand sweep. */
export const Stopwatch: React.FC<{ progress: number; position?: [number, number, number]; scale?: number; rotation?: [number, number, number]; danger?: number }> = ({
  progress,
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  danger = 0,
}) => {
  const face = useTextTexture(
    (ctx, w, h) => {
      ctx.fillStyle = "#fbfbf7";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd6d6";
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, w / 2 - 30, -Math.PI / 2 + Math.PI * 1.5, Math.PI * 1.5);
      ctx.fill();
      ctx.strokeStyle = "#1a1a1a";
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const l = i % 5 === 0 ? 60 : 28;
        ctx.lineWidth = i % 5 === 0 ? 12 : 5;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.sin(a) * (w / 2 - 30), h / 2 - Math.cos(a) * (h / 2 - 30));
        ctx.lineTo(w / 2 + Math.sin(a) * (w / 2 - 30 - l), h / 2 - Math.cos(a) * (h / 2 - 30 - l));
        ctx.stroke();
      }
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `900 92px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.fillText(String(i * 5 || 60), w / 2 + Math.sin(a) * (w / 2 - 175), h / 2 - Math.cos(a) * (h / 2 - 175));
      }
    },
    1024,
    1024,
  );
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.12, 1.12, 0.32, 64]} />
        <meshStandardMaterial color="#d7dde3" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.165]}>
        <circleGeometry args={[1.0, 64]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      {/* sweep wedge (time used) */}
      <mesh position={[0, 0, 0.17]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[0.93, 64, 0, -Math.max(0.001, progress) * Math.PI * 2]} />
        <meshBasicMaterial color={danger > 0.5 ? "#ff3b3b" : "#ff7a7a"} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <group position={[0, 0, 0.19]} rotation={[0, 0, -progress * Math.PI * 2]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.05, 0.85, 0.02]} />
          <meshBasicMaterial color="#e3262e" toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.2]}>
        <circleGeometry args={[0.07, 24]} />
        <meshBasicMaterial color="#111" />
      </mesh>
      {/* crown + button */}
      <mesh position={[0, 1.22, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.2, 20]} />
        <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.38, 0.14, 0.2]} />
        <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.05, 10, 30]} />
        <meshStandardMaterial color="#c9d0d6" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
};

/** Arrow pointing along +X from origin, length l. */
export const Arrow: React.FC<{ l?: number; color?: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; opacity?: number; onTop?: boolean }> = ({
  l = 1,
  color = "#ff4040",
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  opacity = 1,
  onTop = false,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[l * 0.35, 0, 0]} rotation={[0, 0, -Math.PI / 2]} renderOrder={onTop ? 999 : 0}>
      <cylinderGeometry args={[0.07, 0.07, l * 0.7, 12]} />
      <meshBasicMaterial color={color} transparent={opacity < 1 || onTop} opacity={opacity} toneMapped={false} depthTest={!onTop} />
    </mesh>
    <mesh position={[l * 0.82, 0, 0]} rotation={[0, 0, -Math.PI / 2]} renderOrder={onTop ? 999 : 0}>
      <coneGeometry args={[0.18, l * 0.36, 16]} />
      <meshBasicMaterial color={color} transparent={opacity < 1 || onTop} opacity={opacity} toneMapped={false} depthTest={!onTop} />
    </mesh>
  </group>
);

/** Generic deterministic particle burst. dir = main velocity. */
export const Burst: React.FC<{
  age: number;
  origin: [number, number, number];
  dir: [number, number, number];
  spread?: number;
  count?: number;
  size?: number;
  color?: string;
  gravity?: number;
  life?: number;
  shape?: "tri" | "ball";
  seed?: number;
  emissive?: boolean;
}> = ({ age, origin, dir, spread = 0.6, count = 80, size = 0.05, color = "#dff3ff", gravity = 9.8, life = 1.5, shape = "ball", seed = 1, emissive = false }) => {
  const geo = useMemo(() => (shape === "tri" ? new THREE.TetrahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, 0)), [shape]);
  const matr = useMemo(
    () =>
      emissive
        ? new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true })
        : new THREE.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }),
    [color, emissive],
  );
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, matr, count), [geo, matr, count]);
  const m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    const delay = rand(i * 19 + seed) * 0.25;
    const a = age - delay;
    if (a < 0 || a > life) {
      m.makeScale(0, 0, 0);
      mesh.setMatrixAt(i, m);
      continue;
    }
    const k = 0.5 + rand(i * 3 + seed);
    const v = [dir[0] * k + (rand(i * 5 + seed) - 0.5) * spread * 4, dir[1] * k + (rand(i * 7 + seed) - 0.5) * spread * 4, dir[2] * k + (rand(i * 11 + seed) - 0.5) * spread * 4];
    const p = new THREE.Vector3(origin[0] + v[0] * a, origin[1] + v[1] * a - 0.5 * gravity * a * a, origin[2] + v[2] * a);
    const s = size * (0.5 + rand(i * 13 + seed)) * (1 - a / life);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(a * 7 + i, a * 5 + i * 2, i));
    m.compose(p, q, new THREE.Vector3(s, s * (shape === "tri" ? 0.3 : 1), s));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Rising bubbles in a column. */
export const Bubbles: React.FC<{ t: number; origin: [number, number, number]; count?: number; spread?: number; height?: number; speed?: number }> = ({
  t,
  origin,
  count = 60,
  spread = 1.2,
  height = 8,
  speed = 1.6,
}) => {
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const matr = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9fbff", transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, emissive: "#2b6f70" }), []);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, matr, count), [geo, matr, count]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    const y = (((rand(i) * height + t * speed * (0.6 + rand(i * 3))) % height) + height) % height;
    const p = new THREE.Vector3(origin[0] + (rand(i * 5) - 0.5) * spread + Math.sin(t * 3 + i) * 0.08, origin[1] + y, origin[2] + (rand(i * 7) - 0.5) * spread);
    const s = 0.03 + rand(i * 9) * 0.07;
    m.compose(p, q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Soft additive light shafts (god rays) from above. */
export const GodRays: React.FC<{ position: [number, number, number]; count?: number; color?: string; opacity?: number; t?: number; length?: number; width?: number }> = ({
  position,
  count = 6,
  color = "#bff7e8",
  opacity = 0.12,
  t = 0,
  length = 14,
  width = 1.2,
}) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => (
      <mesh key={i} position={[(rand(i) - 0.5) * 8, -length / 2, (rand(i * 3) - 0.5) * 6]} rotation={[0.15 * (rand(i * 5) - 0.5), 0, 0.25 + 0.1 * Math.sin(t * 0.5 + i)]}>
        <cylinderGeometry args={[width * (0.4 + rand(i * 7)), width * 0.15, length, 16, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * (0.6 + 0.4 * Math.sin(t * 1.3 + i * 2))} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    ))}
  </group>
);

/** Crack pattern texture on a plane (transparent), radiating from (u,v). */
export const Cracks: React.FC<{ amount: number; w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; center?: [number, number]; web?: boolean }> = ({
  amount,
  w,
  h,
  position,
  rotation = [0, 0, 0],
  center = [0.85, 0.2],
  web = false,
}) => {
  const tex = useTextTexture(
    (ctx, W, H) => {
      ctx.strokeStyle = "rgba(240,250,255,0.95)";
      ctx.lineCap = "round";
      const cx = center[0] * W;
      const cy = (1 - center[1]) * H;
      for (let i = 0; i < 22; i++) {
        let x = cx;
        let y = cy;
        let a = (i / 22) * Math.PI * 2 + rand(i) * 0.3;
        ctx.lineWidth = 5 - (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 9; k++) {
          a += (rand(i * 31 + k) - 0.5) * 0.5;
          const l = 30 + rand(i * 13 + k) * 70;
          x += Math.cos(a) * l;
          y += Math.sin(a) * l;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (web) {
        for (let r = 1; r < 6; r++) {
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i <= 22; i++) {
            const a = (i / 22) * Math.PI * 2;
            const rr = r * 38 + rand(i * r) * 14;
            const x = cx + Math.cos(a) * rr;
            const y = cy + Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }
    },
    1024,
    1024,
    [web],
  );
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent opacity={amount} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

/** Window-breaker hammer, head at origin pointing -X when rotation 0. */
export const Hammer: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0.32, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.05, 0.06, 0.55, 14]} />
      <meshStandardMaterial color="#e3262e" roughness={0.4} />
    </mesh>
    <mesh position={[0.02, 0, 0]}>
      <boxGeometry args={[0.1, 0.24, 0.1]} />
      <meshStandardMaterial color="#e3262e" roughness={0.4} />
    </mesh>
    <mesh position={[-0.07, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.045, 0.12, 12]} />
      <meshStandardMaterial color="#d9dee3" metalness={0.9} roughness={0.2} />
    </mesh>
    <mesh position={[-0.07, -0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.045, 0.12, 12]} />
      <meshStandardMaterial color="#d9dee3" metalness={0.9} roughness={0.2} />
    </mesh>
  </group>
);

/** Ambulance, front = +X. flash = 0..1 alternates. */
export const Ambulance: React.FC<{ position: [number, number, number]; rotation?: [number, number, number]; t: number; scale?: number }> = ({ position, rotation = [0, 0, 0], t, scale = 1 }) => {
  const on = Math.floor(t * 6) % 2 === 0;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[-0.4, 1.3, 0]}>
        <boxGeometry args={[3.4, 2.1, 2.1]} />
        <meshStandardMaterial color="#f6f7f9" roughness={0.5} />
      </mesh>
      <mesh position={[-0.4, 1.3, 1.06]}>
        <planeGeometry args={[3.2, 0.35]} />
        <meshStandardMaterial color="#e3262e" />
      </mesh>
      <mesh position={[-0.4, 1.3, -1.06]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3.2, 0.35]} />
        <meshStandardMaterial color="#e3262e" />
      </mesh>
      <mesh position={[1.9, 0.95, 0]}>
        <boxGeometry args={[1.3, 1.4, 2.0]} />
        <meshStandardMaterial color="#f6f7f9" />
      </mesh>
      <mesh position={[0.6, 2.45, 0.5]}>
        <boxGeometry args={[0.4, 0.2, 0.5]} />
        <meshBasicMaterial color={on ? "#ff2020" : "#3a0808"} toneMapped={false} />
      </mesh>
      <mesh position={[0.6, 2.45, -0.5]}>
        <boxGeometry args={[0.4, 0.2, 0.5]} />
        <meshBasicMaterial color={on ? "#102040" : "#2f7bff"} toneMapped={false} />
      </mesh>
      <pointLight position={[0.6, 3.2, 0]} color={on ? "#ff2a2a" : "#2f7bff"} intensity={25} distance={14} />
      {[1.6, -1.6].map((x) =>
        [1.0, -1.0].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.3, 18]} />
            <meshStandardMaterial color="#151515" />
          </mesh>
        )),
      )}
    </group>
  );
};

/** City blocks on a grid (for the aerial). Leaves a river channel along X at z in [rz0, rz1]. */
export const City: React.FC<{ size?: number; rz?: [number, number] }> = ({ size = 220, rz = [-12, 12] }) => {
  const blocks = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; c: string; lit: boolean }[] = [];
    let i = 0;
    for (let x = -size / 2; x < size / 2; x += 14) {
      for (let z = -size / 2; z < size / 2; z += 14) {
        i++;
        if (z + 12 > rz[0] - 4 && z < rz[1] + 4) continue;
        if (rand(i * 3) < 0.12) continue;
        const h = 3 + rand(i) * rand(i * 7) * 30;
        const c = ["#2c3c55", "#344866", "#28354a", "#3d4f6e"][Math.floor(rand(i * 5) * 4)];
        out.push({ x: x + 7, z: z + 7, w: 9 + rand(i * 9) * 2, d: 9 + rand(i * 11) * 2, h, c, lit: rand(i * 13) > 0.3 });
      }
    }
    return out;
  }, [size, rz[0], rz[1]]);
  return (
    <group>
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size * 1.6, size * 1.6]} />
        <meshStandardMaterial color="#1a2230" roughness={1} />
      </mesh>
      {blocks.map((b, i) => (
        <group key={i} position={[b.x, b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.9} />
          </mesh>
          {b.lit && (
            <mesh position={[0, b.h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[b.w * 0.5, b.d * 0.5]} />
              <meshBasicMaterial color={rand(i) > 0.5 ? "#ffcf7a" : "#86b9ff"} toneMapped={false} transparent opacity={0.35} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};
