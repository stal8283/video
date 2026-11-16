import { useMemo } from "react";
import * as THREE from "three";
import { rand } from "./util";

/** SpotLight whose target is a child object, so it aims correctly. */
export const Spot: React.FC<{
  position: [number, number, number];
  target: [number, number, number];
  angle?: number;
  penumbra?: number;
  intensity?: number;
  distance?: number;
  color?: string;
  decay?: number;
}> = ({ position, target, ...p }) => {
  const tgt = useMemo(() => new THREE.Object3D(), []);
  tgt.position.set(target[0] - position[0], target[1] - position[1], target[2] - position[2]);
  return (
    <group position={position}>
      <primitive object={tgt} />
      <spotLight target={tgt} decay={p.decay ?? 1.4} {...p} />
    </group>
  );
};

/** Vertical gradient sky dome. */
export const Sky: React.FC<{ top: string; mid: string; bottom: string; radius?: number }> = ({ top, mid, bottom, radius = 400 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(mid, top, smoothstep(0.0,0.55,h)) : mix(mid, bottom, smoothstep(0.0,0.25,-h)); gl_FragColor = vec4(c,1.0);} `,
      }),
    [top, mid, bottom],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[radius, 32, 16]} />
    </mesh>
  );
};

/** Low-poly animated river. `t` = seconds. */
export const River: React.FC<{
  t: number;
  size?: [number, number];
  seg?: number;
  y?: number;
  color?: string;
  amp?: number;
  ripples?: { x: number; z: number; t0: number }[];
  opacity?: number;
  doubleSide?: boolean;
}> = ({ t, size = [160, 160], seg = 70, y = 0, color = "#0f4c5c", amp = 0.18, ripples = [], opacity = 1, doubleSide = false }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], seg, seg);
    g.rotateX(-Math.PI / 2);
    return g.toNonIndexed();
  }, [size[0], size[1], seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    let h = Math.sin(x * 0.35 + t * 1.3) * amp + Math.sin(z * 0.5 - t * 1.7 + x * 0.1) * amp * 0.7 + Math.sin((x + z) * 1.1 + t * 2.3) * amp * 0.25;
    for (const r of ripples) {
      const age = t - r.t0;
      if (age <= 0) continue;
      const d = Math.hypot(x - r.x, z - r.z);
      const front = age * 3.2;
      h += Math.exp(-((d - front) ** 2) * 0.6) * Math.cos((d - front) * 4) * 0.5 * Math.exp(-age * 0.7);
    }
    pos.setY(i, h);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} position={[0, y, 0]}>
      <meshStandardMaterial color={color} flatShading roughness={0.25} metalness={0.35} transparent={opacity < 1} opacity={opacity} side={doubleSide ? THREE.DoubleSide : THREE.FrontSide} />
    </mesh>
  );
};

/** Instanced rain streaks falling deterministically. */
export const Rain: React.FC<{ t: number; count?: number; area?: [number, number, number]; center?: [number, number, number]; speed?: number; color?: string; opacity?: number }> = ({
  t,
  count = 900,
  area = [40, 25, 40],
  center = [0, 10, 0],
  speed = 18,
  color = "#bcd7ff",
  opacity = 0.45,
}) => {
  const geo = useMemo(() => new THREE.BoxGeometry(0.02, 0.55, 0.02), []);
  const matr = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, matr, count), [geo, matr, count]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.12));
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    const y = ((rand(i * 3 + 1) * area[1] - t * speed * (0.85 + rand(i) * 0.3)) % area[1] + area[1]) % area[1];
    const p = new THREE.Vector3(center[0] + (rand(i * 7) - 0.5) * area[0] + y * 0.12, center[1] - area[1] / 2 + y, center[2] + (rand(i * 13) - 0.5) * area[2]);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

/** Splash: droplets thrown up in a crown + white foam disc. age in seconds. */
export const Splash: React.FC<{ age: number; position: [number, number, number]; size?: number; count?: number }> = ({ age, position, size = 1, count = 160 }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.12, 0), []);
  const matr = useMemo(() => new THREE.MeshBasicMaterial({ color: "#d9f4ff", transparent: true, opacity: 0.85, toneMapped: false }), []);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, matr, count), [geo, matr, count]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    if (age < 0) {
      m.makeScale(0, 0, 0);
      mesh.setMatrixAt(i, m);
      continue;
    }
    const a = rand(i) * Math.PI * 2;
    const sp = (3 + rand(i * 5) * 6) * size;
    const up = (5 + rand(i * 11) * 9) * size;
    const x = Math.cos(a) * sp * age;
    const z = Math.sin(a) * sp * age * 0.6;
    const y = up * age - 9.8 * age * age;
    const sc = Math.max(0, (1 - age / 1.6)) * (0.25 + rand(i * 17) * 0.6) * size;
    m.compose(new THREE.Vector3(position[0] + x, position[1] + Math.max(y, -1), position[2] + z), q, new THREE.Vector3(sc, sc, sc));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  const foam = age > 0 ? Math.min(1, age * 3) * Math.max(0, 1 - age / 3) : 0;
  return (
    <>
      <primitive object={mesh} />
      {foam > 0 && (
        <mesh position={[position[0], position[1] + 0.25, position[2]]} rotation={[-Math.PI / 2, 0, 0]} scale={(1.2 + age * 1.6) * size}>
          <ringGeometry args={[0.75, 1, 40]} />
          <meshBasicMaterial color="#e6f6ff" transparent opacity={foam * 0.45} depthWrite={false} />
        </mesh>
      )}
    </>
  );
};

/** Bridge running along X at deck height y. A gap in the near guardrail at gapX (broken rail). */
export const Bridge: React.FC<{ y?: number; length?: number; gapX?: number | null; z?: number }> = ({ y = 6, length = 160, gapX = null, z = 0 }) => {
  const posts = [];
  for (let x = -length / 2; x <= length / 2; x += 2) {
    for (const side of [-1, 1]) {
      if (side === 1 && gapX !== null && Math.abs(x - gapX) < 3) continue;
      posts.push(
        <mesh key={`${x}${side}`} position={[x, y + 0.55, z + side * 4.6]}>
          <boxGeometry args={[0.14, 1.1, 0.14]} />
          <meshStandardMaterial color="#8d99a6" metalness={0.6} roughness={0.4} />
        </mesh>,
      );
    }
  }
  const rail = (side: number) => {
    if (side === 1 && gapX !== null) {
      const l1 = gapX - 3 + length / 2;
      const l2 = length / 2 - (gapX + 3);
      return (
        <group key={side}>
          <mesh position={[-length / 2 + l1 / 2, y + 1.05, z + side * 4.6]}>
            <boxGeometry args={[l1, 0.22, 0.1]} />
            <meshStandardMaterial color="#b9c3cc" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[gapX + 3 + l2 / 2, y + 1.05, z + side * 4.6]}>
            <boxGeometry args={[l2, 0.22, 0.1]} />
            <meshStandardMaterial color="#b9c3cc" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* bent rail ends */}
          <mesh position={[gapX - 2.4, y + 0.95, z + 5.2]} rotation={[0, 0.6, -0.2]}>
            <boxGeometry args={[1.6, 0.22, 0.1]} />
            <meshStandardMaterial color="#b9c3cc" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      );
    }
    return (
      <mesh key={side} position={[0, y + 1.05, z + side * 4.6]}>
        <boxGeometry args={[length, 0.22, 0.1]} />
        <meshStandardMaterial color="#b9c3cc" metalness={0.7} roughness={0.3} />
      </mesh>
    );
  };
  const lamps = [];
  for (let x = -length / 2 + 6; x < length / 2; x += 16) {
    lamps.push(
      <group key={x} position={[x, y, z - 4.9]}>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 5, 8]} />
          <meshStandardMaterial color="#59636e" />
        </mesh>
        <mesh position={[0, 5, 0.6]}>
          <boxGeometry args={[0.5, 0.12, 0.25]} />
          <meshBasicMaterial color="#ffd38a" toneMapped={false} />
        </mesh>
        <pointLight position={[0, 4.7, 1.2]} intensity={14} distance={16} decay={1.5} color="#ffbe6b" />
      </group>,
    );
  }
  const pillars = [];
  for (let x = -length / 2 + 12; x < length / 2; x += 24) {
    pillars.push(
      <mesh key={x} position={[x, y / 2 - 3, z]}>
        <boxGeometry args={[1.6, y + 6, 6]} />
        <meshStandardMaterial color="#4b5560" roughness={0.9} />
      </mesh>,
    );
  }
  return (
    <group>
      <mesh position={[0, y - 0.35, z]}>
        <boxGeometry args={[length, 0.7, 9.6]} />
        <meshStandardMaterial color="#59626b" roughness={0.9} />
      </mesh>
      <mesh position={[0, y + 0.01, z]}>
        <boxGeometry args={[length, 0.02, 9]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* lane dashes */}
      {Array.from({ length: Math.floor(length / 4) }, (_, i) => (
        <mesh key={i} position={[-length / 2 + i * 4, y + 0.03, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 0.16]} />
          <meshBasicMaterial color="#e8d27a" />
        </mesh>
      ))}
      {posts}
      {rail(-1)}
      {rail(1)}
      {lamps}
      {pillars}
    </group>
  );
};

/** Distant city skyline silhouette with lit windows. */
export const Skyline: React.FC<{ z?: number; width?: number; count?: number; color?: string }> = ({ z = -120, width = 300, count = 45, color = "#1a2738" }) => (
  <group>
    {Array.from({ length: count }, (_, i) => {
      const h = 10 + rand(i * 3) * 40;
      const w = 5 + rand(i * 5) * 9;
      const x = -width / 2 + (i / count) * width + rand(i) * 4;
      return (
        <group key={i} position={[x, h / 2 - 2, z - rand(i * 7) * 20]}>
          <mesh>
            <boxGeometry args={[w, h, 6]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
          {Array.from({ length: 6 }, (_, k) => (
            <mesh key={k} position={[(rand(i * 31 + k) - 0.5) * w * 0.8, (rand(i * 17 + k) - 0.5) * h * 0.8, 3.01]}>
              <planeGeometry args={[0.8, 1.1]} />
              <meshBasicMaterial color={rand(i + k * 9) > 0.4 ? "#ffd27a" : "#6fb7ff"} toneMapped={false} />
            </mesh>
          ))}
        </group>
      );
    })}
  </group>
);
