import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { useThree } from "@react-three/fiber";
import { rand } from "./util";
import { asphaltTex, cloudTex, concreteTex, facadeTex, glowTex, moonTex } from "./Textures";

/* ---------------------------------------------------------------- lights & environment */

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

let envTex: THREE.Texture | null = null;
/** Image-based reflections for paint, glass and water (generated, no HDR file). */
export const Env: React.FC<{ intensity?: number }> = ({ intensity = 0.35 }) => {
  const { gl, scene } = useThree();
  if (!envTex) {
    const pm = new THREE.PMREMGenerator(gl);
    envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  }
  scene.environment = envTex;
  (scene as THREE.Scene & { environmentIntensity: number }).environmentIntensity = intensity;
  return null;
};

/** Soft additive glow sprite (lamp halos, headlights). */
export const Glow: React.FC<{ position: [number, number, number]; size?: number; color?: string; opacity?: number; stretch?: [number, number] }> = ({
  position,
  size = 1,
  color = "#ffc977",
  opacity = 0.9,
  stretch = [1, 1],
}) => (
  <sprite position={position} scale={[size * stretch[0], size * stretch[1], 1]}>
    <spriteMaterial map={glowTex()} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
  </sprite>
);

/* ---------------------------------------------------------------- sky */
const skyMats = new Map<string, THREE.ShaderMaterial>();
export const Sky: React.FC<{ top: string; mid: string; bottom: string; radius?: number; moon?: boolean; clouds?: boolean; stars?: boolean }> = ({
  top,
  mid,
  bottom,
  radius = 400,
  moon = true,
  clouds = true,
  stars = true,
}) => {
  const key = top + mid + bottom;
  let mat = skyMats.get(key);
  if (!mat) {
    mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(mid, top, smoothstep(0.0,0.5,h)) : mix(mid, bottom, smoothstep(0.0,0.2,-h));
          vec2 g = floor(vec2(atan(vP.z, vP.x) * 300.0, vP.y * 300.0));
          float s = step(0.9965, h21(g)) * smoothstep(0.15, 0.5, h);
          c += vec3(s) * 0.8;
          gl_FragColor = vec4(c,1.0);} `,
    });
    skyMats.set(key, mat);
  }
  return (
    <group>
      <mesh material={mat} renderOrder={-2}>
        <sphereGeometry args={[radius, 48, 24]} />
      </mesh>
      {moon && (
        <>
          <sprite position={[-radius * 0.35, radius * 0.42, -radius * 0.8]} scale={[radius * 0.07, radius * 0.07, 1]} renderOrder={-1}>
            <spriteMaterial map={moonTex()} fog={false} toneMapped={false} depthWrite={false} />
          </sprite>
          <sprite position={[-radius * 0.35, radius * 0.42, -radius * 0.79]} scale={[radius * 0.3, radius * 0.3, 1]} renderOrder={-1}>
            <spriteMaterial map={glowTex()} color="#9fb8ff" opacity={0.35} transparent blending={THREE.AdditiveBlending} fog={false} depthWrite={false} />
          </sprite>
        </>
      )}
      {clouds &&
        Array.from({ length: 9 }, (_, i) => (
          <sprite key={i} position={[(rand(i) - 0.5) * radius * 1.6, radius * (0.12 + rand(i * 3) * 0.25), -radius * (0.6 + rand(i * 5) * 0.3)]} scale={[radius * 0.6, radius * 0.22, 1]} renderOrder={-1}>
            <spriteMaterial map={cloudTex()} color={mid} opacity={0.5} transparent fog={false} depthWrite={false} />
          </sprite>
        ))}
    </group>
  );
};

/* ---------------------------------------------------------------- water */
/** Smooth animated river with reflections (env map) + specular sparkle. `t` = seconds. */
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
}> = ({ t, size = [160, 160], seg = 90, y = 0, color = "#06303b", amp = 0.14, ripples = [], opacity = 1, doubleSide = false }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size[0], size[1], seg, seg);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size[0], size[1], seg]);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    let h = Math.sin(x * 0.35 + t * 1.3) * amp + Math.sin(z * 0.5 - t * 1.7 + x * 0.1) * amp * 0.7 + Math.sin((x + z) * 1.7 + t * 2.9) * amp * 0.22;
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
      <meshPhysicalMaterial
        color={color}
        roughness={0.18}
        metalness={0}
        clearcoat={0.7}
        clearcoatRoughness={0.1}
        envMapIntensity={0.45}
        transparent={opacity < 1}
        opacity={opacity}
        side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
};

/** Vertical light reflections on water under a light source. */
export const WaterGlint: React.FC<{ x: number; z: number; color?: string; t: number; length?: number }> = ({ x, z, color = "#ffbe6b", t, length = 9 }) => (
  <group>
    {Array.from({ length: 5 }, (_, i) => (
      <mesh key={i} position={[x + Math.sin(t * 3 + i * 2 + x) * 0.15, 0.06, z + 1 + i * (length / 5)]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6 - i * 0.07, length / 5]} />
        <meshBasicMaterial map={glowTex()} color={color} transparent opacity={0.55 - i * 0.08} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

export const Rain: React.FC<{ t: number; count?: number; area?: [number, number, number]; center?: [number, number, number]; speed?: number; color?: string; opacity?: number }> = ({
  t,
  count = 900,
  area = [40, 25, 40],
  center = [0, 10, 0],
  speed = 18,
  color = "#bcd7ff",
  opacity = 0.28,
}) => {
  const geo = useMemo(() => new THREE.BoxGeometry(0.012, 0.45, 0.012), []);
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

/* ---------------------------------------------------------------- bridge */
const steel = new THREE.MeshStandardMaterial({ color: "#3f7f86", metalness: 0.6, roughness: 0.35 });
const railMat = new THREE.MeshStandardMaterial({ color: "#c9d1d8", metalness: 0.85, roughness: 0.25 });

/** Steel arch road bridge running along X at deck height y. A gap in the near guardrail at gapX. */
export const Bridge: React.FC<{ y?: number; length?: number; gapX?: number | null; z?: number; t?: number; lampLights?: number[] }> = ({ y = 6, length = 160, gapX = null, z = 0, t = 0, lampLights = [] }) => {
  const deckSide = useMemo(() => new THREE.MeshStandardMaterial({ map: concreteTex([length / 8, 1], "#8a9096"), roughness: 0.9 }), [length]);
  const road = useMemo(() => new THREE.MeshStandardMaterial({ map: asphaltTex([length / 6, 1.5]), roughness: 0.35, metalness: 0.1, envMapIntensity: 0.8 }), [length]);
  const curb = useMemo(() => new THREE.MeshStandardMaterial({ map: concreteTex([length / 4, 0.5], "#a7adb2"), roughness: 0.8 }), [length]);
  const pillarMat = useMemo(() => new THREE.MeshStandardMaterial({ map: concreteTex([1, 3], "#6f777e"), roughness: 0.95 }), []);
  const postGeo = useMemo(() => new THREE.BoxGeometry(0.14, 1.0, 0.14), []);
  const posts = useMemo(() => {
    const xs: [number, number][] = [];
    for (let x = -length / 2; x <= length / 2; x += 2) for (const side of [-1, 1]) if (!(side === 1 && gapX !== null && Math.abs(x - gapX) < 3)) xs.push([x, side]);
    const m = new THREE.InstancedMesh(postGeo, railMat, xs.length);
    const mat = new THREE.Matrix4();
    xs.forEach(([x, s], i) => {
      mat.makeTranslation(x, y + 0.5, z + s * 4.5);
      m.setMatrixAt(i, mat);
    });
    return m;
  }, [length, gapX, y, z, postGeo]);
  const railSeg = (x0: number, x1: number, side: number, k: string) => (
    <mesh key={k} position={[(x0 + x1) / 2, y + 0.95, z + side * 4.55]}>
      <boxGeometry args={[x1 - x0, 0.28, 0.08]} />
      <primitive object={railMat} attach="material" />
    </mesh>
  );
  const rails = [railSeg(-length / 2, length / 2, -1, "far")];
  if (gapX === null) rails.push(railSeg(-length / 2, length / 2, 1, "near"));
  else rails.push(railSeg(-length / 2, gapX - 3, 1, "n1"), railSeg(gapX + 3, length / 2, 1, "n2"));
  // steel arches over each span (both sides)
  const arches = useMemo(() => {
    const out: THREE.TubeGeometry[] = [];
    for (let x0 = -length / 2; x0 < length / 2 - 1; x0 += 40) {
      const pts = Array.from({ length: 17 }, (_, i) => {
        const u = i / 16;
        return new THREE.Vector3(x0 + u * 40, y + 0.3 + Math.sin(u * Math.PI) * 9, 0);
      });
      out.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.32, 8, false));
    }
    return out;
  }, [length, y]);
  const lamps: number[] = [];
  for (let x = -length / 2 + 6; x < length / 2; x += 14) lamps.push(x);
  return (
    <group>
      {/* deck */}
      <mesh position={[0, y - 0.6, z]} material={deckSide}>
        <boxGeometry args={[length, 1.2, 10]} />
      </mesh>
      <mesh position={[0, y + 0.005, z]} rotation={[-Math.PI / 2, 0, 0]} material={road}>
        <planeGeometry args={[length, 7.4]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, y + 0.12, z + s * 4.3]} material={curb}>
          <boxGeometry args={[length, 0.25, 1.4]} />
        </mesh>
      ))}
      {/* lane markings */}
      {Array.from({ length: Math.floor(length / 5) }, (_, i) => (
        <mesh key={i} position={[-length / 2 + i * 5, y + 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.4, 0.15]} />
          <meshStandardMaterial color="#f2d16b" roughness={0.5} emissive="#3a2d05" />
        </mesh>
      ))}
      {[-3.5, 3.5].map((zz) => (
        <mesh key={zz} position={[0, y + 0.02, z + zz]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[length, 0.12]} />
          <meshStandardMaterial color="#e8eef3" roughness={0.6} />
        </mesh>
      ))}
      <primitive object={posts} />
      {rails}
      {/* arches + hangers */}
      {[-1, 1].map((s) => (
        <group key={s} position={[0, 0, z + s * 5.1]}>
          {arches.map((g, i) => (
            <mesh key={i} geometry={g} material={steel} />
          ))}
          {Array.from({ length: Math.floor(length / 4) }, (_, i) => {
            const x = -length / 2 + i * 4;
            const u = ((x + length / 2) % 40) / 40;
            const h = Math.sin(u * Math.PI) * 9;
            return h > 0.6 ? (
              <mesh key={i} position={[x, y + 0.3 + h / 2, 0]} material={steel}>
                <boxGeometry args={[0.08, h, 0.08]} />
              </mesh>
            ) : null;
          })}
        </group>
      ))}
      {/* pillars */}
      {Array.from({ length: Math.ceil(length / 40) + 1 }, (_, i) => {
        const x = -length / 2 + i * 40;
        return (
          <mesh key={i} position={[x, y / 2 - 4, z]} material={pillarMat}>
            <cylinderGeometry args={[1.3, 1.6, y + 7, 20]} />
          </mesh>
        );
      })}
      {/* lamp posts with glowing heads */}
      {lamps.map((x, i) => (
        <group key={x} position={[x, y + 0.25, z - 4.75]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.07, 0.11, 6, 10]} />
            <meshStandardMaterial color="#2e3640" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 5.9, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
            <meshStandardMaterial color="#2e3640" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 5.8, 1.1]}>
            <boxGeometry args={[0.5, 0.14, 0.32]} />
            <meshBasicMaterial color="#fff1cf" toneMapped={false} />
          </mesh>
          <Glow position={[0, 5.6, 1.1]} size={3.2} color="#ffc47a" opacity={0.75} />
          <Glow position={[0, 5.6, 1.1]} size={0.9} color="#fff3d6" opacity={1} />
          {/* pool of light on the road */}
          <mesh position={[0, -0.22, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.6, 24]} />
            <meshBasicMaterial map={glowTex()} color="#ffb257" transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <WaterGlint x={0} z={-y - 4} t={t + i} />
        </group>
      ))}
      {lampLights.map((x) => (
        <pointLight key={x} position={[x, y + 5.4, z - 3.6]} intensity={22} distance={18} decay={1.4} color="#ffbe6b" />
      ))}
    </group>
  );
};

/* ---------------------------------------------------------------- buildings */
const roofMat = new THREE.MeshStandardMaterial({ color: "#2a313b", roughness: 0.9 });
const propMat = new THREE.MeshStandardMaterial({ color: "#5b636d", roughness: 0.7, metalness: 0.3 });

/** A city building with a lit-window facade, roof cap, setback and rooftop props. */
export const Building: React.FC<{ position: [number, number, number]; w: number; d: number; h: number; seed: number; wall?: string; t?: number }> = ({
  position,
  w,
  d,
  h,
  seed,
  wall,
  t = 0,
}) => {
  const walls = ["#3b4658", "#4a3f45", "#36505a", "#514a3d", "#3d3f55"];
  const wc = wall ?? walls[seed % walls.length];
  const mats = useMemo(() => {
    const [map, em] = facadeTex(seed % 7, 6, 12, wc);
    const mk = (rx: number) => {
      const m2 = map.clone();
      const e2 = em.clone();
      m2.needsUpdate = e2.needsUpdate = true;
      m2.repeat.set(rx, h / 14);
      e2.repeat.set(rx, h / 14);
      return new THREE.MeshStandardMaterial({ map: m2, emissiveMap: e2, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 1.2, roughness: 0.75 });
    };
    const side = mk(Math.max(1, Math.round(d / 7)));
    const front = mk(Math.max(1, Math.round(w / 7)));
    return [side, side, roofMat, roofMat, front, front];
  }, [seed, w, d, h, wc]);
  const setback = rand(seed * 3) > 0.6;
  const tank = rand(seed * 5) > 0.55;
  const antenna = rand(seed * 7) > 0.65;
  const blink = Math.floor(t * 1.5 + seed) % 2 === 0;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} material={mats}>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <mesh position={[0, h + 0.25, 0]} material={roofMat}>
        <boxGeometry args={[w + 0.4, 0.5, d + 0.4]} />
      </mesh>
      {setback && (
        <mesh position={[w * 0.1, h + 2.5, -d * 0.1]} material={mats}>
          <boxGeometry args={[w * 0.6, 4, d * 0.6]} />
        </mesh>
      )}
      {tank && (
        <group position={[-w * 0.25, h + 0.5, d * 0.2]}>
          <mesh position={[0, 2, 0]} material={propMat}>
            <cylinderGeometry args={[1, 1, 2.2, 14]} />
          </mesh>
          <mesh position={[0, 3.4, 0]} material={propMat}>
            <coneGeometry args={[1.1, 0.7, 14]} />
          </mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 0.5, 0]} material={propMat}>
              <boxGeometry args={[0.1, 1.2, 0.1]} />
            </mesh>
          ))}
        </group>
      )}
      <mesh position={[w * 0.25, h + 0.9, -d * 0.25]} material={propMat}>
        <boxGeometry args={[1.6, 0.8, 1.2]} />
      </mesh>
      {antenna && (
        <group position={[0, h, 0]}>
          <mesh position={[0, 3, 0]} material={propMat}>
            <cylinderGeometry args={[0.05, 0.08, 6, 6]} />
          </mesh>
          {blink && <Glow position={[0, 6.1, 0]} size={2} color="#ff3030" />}
        </group>
      )}
    </group>
  );
};

/** Distant city skyline with lit windows. */
export const Skyline: React.FC<{ z?: number; width?: number; count?: number; t?: number }> = ({ z = -110, width = 320, count = 34, t = 0 }) => (
  <group>
    {Array.from({ length: count }, (_, i) => {
      const h = 14 + rand(i * 3) * rand(i * 11) * 70;
      const w = 9 + rand(i * 5) * 12;
      const x = -width / 2 + (i / count) * width + rand(i) * 6;
      return <Building key={i} seed={i + 3} position={[x, -2, z - rand(i * 7) * 30]} w={w} d={10} h={h} t={t} />;
    })}
  </group>
);

/** Rounded box helper geometry (bevelled edges like the reference sets). */
const rbCache = new Map<string, THREE.BufferGeometry>();
export const rbox = (w: number, h: number, d: number, r = 0.06) => {
  const k = `${w}|${h}|${d}|${r}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
    rbCache.set(k, g);
  }
  return g;
};
