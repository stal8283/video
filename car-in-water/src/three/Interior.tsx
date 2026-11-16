import { useMemo } from "react";
import * as THREE from "three";
import { Figure, FigureProps } from "./Figure";
import { rand } from "./util";
import { fabricTex, gaugeTex, plasticTex } from "./Textures";
import { Glow } from "./World";

/**
 * Car cabin seen from the dashboard looking back at the driver (forward = +Z, toward camera).
 * Driver sits on the left (x = -0.42). Windows: left door, right door, rear.
 */
export type InteriorProps = {
  t: number;
  driver?: FigureProps;
  kid?: FigureProps | null;
  outside?: "road" | "water";
  outsideLevel?: number; // y of water outside (cabin roof = 1.65)
  insideLevel?: number; // y of water inside the cabin (-1 = none)
  windowDown?: number; // 0..1 left window lowered
  seatbelt?: number; // 1 = buckled, 0 = released (strap retracts)
  ambient?: string;
  ambientI?: number;
  dash?: string;
  dashI?: number;
  windowColor?: string;
  roadSpeed?: number;
  rainOnGlass?: boolean;
  children?: React.ReactNode;
};

let _mats: { fabric: THREE.Material; plastic: THREE.Material; trim: THREE.Material; headliner: THREE.Material } | null = null;
const mats = () =>
  (_mats ??= {
    fabric: new THREE.MeshStandardMaterial({ map: fabricTex("#3a4458", [3, 3]), roughness: 0.95 }),
    plastic: new THREE.MeshStandardMaterial({ map: plasticTex("#23292f"), roughness: 0.6, envMapIntensity: 0.4 }),
    trim: new THREE.MeshStandardMaterial({ map: plasticTex("#47505c"), roughness: 0.55, envMapIntensity: 0.4 }),
    headliner: new THREE.MeshStandardMaterial({ map: fabricTex("#8b8578", [4, 4]), roughness: 1 }),
  });

const Win: React.FC<{ w: number; h: number; position: [number, number, number]; rotation?: [number, number, number]; drops?: boolean; t: number; lowered?: number }> = ({
  w,
  h,
  position,
  rotation = [0, 0, 0],
  drops = true,
  t,
  lowered = 0,
}) => {
  const ds = useMemo(() => Array.from({ length: 28 }, (_, i) => [rand(i * 3) - 0.5, rand(i * 5) - 0.5, 0.01 + rand(i * 7) * 0.025, rand(i * 11)]), []);
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, -lowered * h, 0]}>
        <mesh>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color="#9fc6e8" transparent opacity={0.12} roughness={0.05} metalness={0.2} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {drops &&
          ds.map(([x, y, r, s], i) => {
            const yy = ((y + 0.5 - ((t * (0.05 + s * 0.2)) % 1) + 1) % 1) - 0.5;
            if (yy * h - lowered * h < -h / 2) return null;
            return (
              <mesh key={i} position={[x * w, yy * h, 0.01]}>
                <circleGeometry args={[r, 10]} />
                <meshBasicMaterial color="#d8ecff" transparent opacity={0.55} depthWrite={false} />
              </mesh>
            );
          })}
      </group>
    </group>
  );
};

export const Interior: React.FC<InteriorProps> = ({
  t,
  driver = {},
  kid = null,
  outside = "road",
  outsideLevel = -5,
  insideLevel = -1,
  windowDown = 0,
  seatbelt = 1,
  ambient = "#4a5d7a",
  ambientI = 0.9,
  dash = "#ff9a3c",
  dashI = 4,
  windowColor = "#0b1830",
  roadSpeed = 1,
  rainOnGlass = true,
  children,
}) => {
  const { fabric, plastic, trim, headliner } = mats();
  const W = 0.92;
  const roof = 1.68;
  const winY = 1.24;
  const winH = 0.56;
  // outside: things visible through windows
  const lights = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);
  const outsideView =
    outside === "road" ? (
      <group>
        {/* passing street lamps (bokeh glows) streaking backward (toward -Z) */}
        {lights.map((i) => {
          const zz = 14 - (((t * 9 * roadSpeed + i * 4.5) % 60) + 60) % 60;
          return (
            <group key={i}>
              <Glow position={[-4.5, 3.2, zz]} size={1.6} color="#ffbe6b" />
              <Glow position={[4.5, 3.2, zz + 2]} size={1.6} color="#ffbe6b" />
              <Glow position={[-9 - (i % 3) * 3, 1.5 + (i % 4), zz * 1.3]} size={0.9} color={i % 2 ? "#8fc3ff" : "#ffd59a"} opacity={0.6} />
            </group>
          );
        })}
        <mesh position={[0, -0.3, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[30, 80]} />
          <meshStandardMaterial color="#1b2027" roughness={0.3} />
        </mesh>
        {/* headlights of the truck behind, growing */}
        <mesh position={[0, 0.9, -12]}>
          <planeGeometry args={[60, 30]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
      </group>
    ) : (
      <group>
        {/* night rain sky above the waterline */}
        <mesh position={[0, 3, -6]}>
          <planeGeometry args={[30, 20]} />
          <meshBasicMaterial color={windowColor} />
        </mesh>
        {[
          [-3.2, -1],
          [3.2, 1],
        ].map(([x, s]) => (
          <mesh key={x} position={[x, 3, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[30, 20]} />
            <meshBasicMaterial color={windowColor} />
          </mesh>
        ))}
        {/* water slabs outside left / right / rear windows */}
        {[
          [-2.2, 0, 2.4, 6],
          [2.2, 0, 2.4, 6],
          [0, -3.2, 6, 2.6],
        ].map(([x, z, sx, sz], i) => (
          <group key={i}>
            <mesh position={[x, (outsideLevel - 6) / 2, z]}>
              <boxGeometry args={[sx, outsideLevel + 6, sz]} />
              <meshStandardMaterial color="#0d5a5a" transparent opacity={0.82} roughness={0.2} emissive="#06302f" depthWrite={false} />
            </mesh>
            <mesh position={[x, outsideLevel + 0.005 + Math.sin(t * 3 + i) * 0.015, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[sx, sz]} />
              <meshBasicMaterial color="#5fd0c4" transparent opacity={0.5} />
            </mesh>
          </group>
        ))}
      </group>
    );

  return (
    <group>
      <ambientLight color={ambient} intensity={ambientI * 2.6} />
      <hemisphereLight args={["#9fb8d8", "#1a1410", 0.6]} />
      <pointLight position={[0, 0.95, 0.75]} color={dash} intensity={dashI * 1.6} distance={4} decay={1.2} />
      <pointLight position={[0.2, 1.5, 1.4]} color="#dfe8ff" intensity={1.4} distance={4} decay={1.2} />
      <pointLight position={[0, roof - 0.1, -0.4]} color="#9ab8ff" intensity={0.6} distance={3} />
      {outsideView}
      {/* floor, roof */}
      <mesh position={[0, 0, -0.4]} material={fabric}>
        <boxGeometry args={[W * 2, 0.05, 3]} />
      </mesh>
      <mesh position={[0, roof, -0.4]} material={headliner}>
        <boxGeometry args={[W * 2 + 0.1, 0.06, 3.2]} />
      </mesh>
      {/* side walls: lower door panel, pillars */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * W, 0.48, -0.35]} material={trim}>
            <boxGeometry args={[0.06, 0.96, 2.5]} />
          </mesh>
          {/* door armrest + handle */}
          <mesh position={[s * (W - 0.06), 0.86, 0.05]} material={plastic}>
            <boxGeometry args={[0.08, 0.06, 0.7]} />
          </mesh>
          <mesh position={[s * (W - 0.05), 0.98, 0.32]}>
            <boxGeometry args={[0.04, 0.05, 0.16]} />
            <meshStandardMaterial color="#b9c2cc" metalness={0.8} roughness={0.25} />
          </mesh>
          {/* pillars */}
          <mesh position={[s * W, winY, 0.62]} material={plastic}>
            <boxGeometry args={[0.07, winH + 0.1, 0.12]} />
          </mesh>
          <mesh position={[s * W, winY, -0.62]} material={plastic}>
            <boxGeometry args={[0.07, winH + 0.1, 0.1]} />
          </mesh>
          <mesh position={[s * W, winY, -1.55]} material={plastic}>
            <boxGeometry args={[0.07, winH + 0.1, 0.16]} />
          </mesh>
          <mesh position={[s * W, roof - 0.07, -0.4]} material={plastic}>
            <boxGeometry args={[0.07, 0.12, 3.1]} />
          </mesh>
          <Win w={1.22} h={winH} position={[s * W, winY, 0]} rotation={[0, (s * Math.PI) / 2, 0]} t={t} drops={rainOnGlass} lowered={s === -1 ? windowDown : 0} />
          <Win w={0.85} h={winH} position={[s * W, winY, -1.08]} rotation={[0, (s * Math.PI) / 2, 0]} t={t + 3} drops={rainOnGlass} />
        </group>
      ))}
      {/* rear: wall + window */}
      <mesh position={[0, 0.48, -1.65]} material={trim}>
        <boxGeometry args={[W * 2, 0.96, 0.06]} />
      </mesh>
      <Win w={W * 2 - 0.2} h={winH} position={[0, winY, -1.65]} t={t + 7} drops={rainOnGlass} />
      {/* seats */}
      {[-0.42, 0.42].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.32, -0.15]} material={fabric}>
            <boxGeometry args={[0.6, 0.18, 0.55]} />
          </mesh>
          <mesh position={[x, 0.85, -0.45]} rotation={[-0.12, 0, 0]} material={fabric}>
            <boxGeometry args={[0.6, 0.95, 0.15]} />
          </mesh>
          <mesh position={[x, 1.45, -0.52]} material={fabric}>
            <boxGeometry args={[0.32, 0.22, 0.12]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.85, -1.3]} material={fabric}>
        <boxGeometry args={[W * 2 - 0.1, 0.8, 0.2]} />
      </mesh>
      {/* center console + coffee */}
      <mesh position={[0, 0.42, 0.25]} material={plastic}>
        <boxGeometry args={[0.24, 0.3, 0.8]} />
      </mesh>
      {/* driver */}
      <Figure position={[-0.42, 0.78, -0.2]} scale={0.4} {...driver} />
      {/* seatbelt: from left B-pillar to right hip, retracts when released */}
      {seatbelt > 0.01 && (
        <group position={[-0.42, 0.78, -0.13]}>
          <mesh position={[-0.13 * seatbelt + 0.0, 0.1, 0]} rotation={[0, 0, -0.9]} scale={[seatbelt, 1, 1]}>
            <planeGeometry args={[0.62, 0.05]} />
            <meshBasicMaterial color="#14181e" />
          </mesh>
        </group>
      )}
      {kid && <Figure position={[0.45, 0.66, -1.05]} scale={0.27} hair="kid" shirt="#f08a24" {...kid} />}
      {/* dashboard (camera sits just in front of it) */}
      <mesh position={[0, 0.66, 0.78]} material={plastic}>
        <boxGeometry args={[W * 2, 0.22, 0.4]} />
      </mesh>
      {/* instrument cluster + infotainment screen + vents */}
      <mesh position={[-0.42, 0.77, 0.58]} rotation={[-0.35, 0, 0]}>
        <planeGeometry args={[0.3, 0.11]} />
        <meshBasicMaterial map={gaugeTex()} toneMapped={false} />
      </mesh>
      <mesh position={[0.02, 0.76, 0.58]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.13, 0.08]} />
        <meshBasicMaterial color="#1f4f95" toneMapped={false} />
      </mesh>
      {[-0.75, 0.3, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.73, 0.575]} material={trim}>
          <boxGeometry args={[0.16, 0.06, 0.02]} />
        </mesh>
      ))}
      {/* rear-view mirror + sun visors */}
      <mesh position={[0.02, roof - 0.16, 0.55]} material={plastic}>
        <boxGeometry args={[0.3, 0.09, 0.04]} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, roof - 0.06, 0.45]} rotation={[0.25, 0, 0]} material={headliner}>
          <boxGeometry args={[0.55, 0.03, 0.22]} />
        </mesh>
      ))}
      {/* steering wheel */}
      <group position={[-0.42, 0.6, 0.42]} rotation={[0.9, 0, 0]} scale={0.85}>
        <mesh>
          <torusGeometry args={[0.19, 0.025, 10, 36]} />
          <meshStandardMaterial color="#101317" roughness={0.6} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.36, 0.03, 0.02]} />
          <meshStandardMaterial color="#101317" />
        </mesh>
      </group>
      {/* water inside the cabin */}
      {insideLevel > -0.5 && (
        <group>
          <mesh position={[0, insideLevel / 2, -0.4]}>
            <boxGeometry args={[W * 2 - 0.02, Math.max(0.01, insideLevel), 2.5]} />
            <meshStandardMaterial color="#0f6b66" transparent opacity={0.55} roughness={0.15} depthWrite={false} />
          </mesh>
          <mesh position={[0, insideLevel + Math.sin(t * 4) * 0.01, -0.4]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W * 2 - 0.02, 2.5]} />
            <meshStandardMaterial color="#58d6c8" transparent opacity={0.45} roughness={0.1} metalness={0.3} depthWrite={false} />
          </mesh>
        </group>
      )}
      {children}
    </group>
  );
};

/** Phone with an emissive screen texture. */
export const Phone: React.FC<{ tex: THREE.Texture; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number }> = ({
  tex,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh>
      <boxGeometry args={[0.36, 0.72, 0.04]} />
      <meshStandardMaterial color="#0d0f12" roughness={0.3} metalness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.021]}>
      <planeGeometry args={[0.33, 0.68]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 0, 0.3]} color="#7fb6ff" intensity={1.6} distance={1.6} />
  </group>
);
