import { useMemo } from "react";
import * as THREE from "three";
import { Glow, Spot, rbox } from "./World";
import { HeadSprite } from "./Figure";

/**
 * Cartoon hatchback in the reference style: chunky toy proportions, a clearly readable glass cabin
 * (light-blue glass with white highlight streaks, see-through to the seats and driver), painted pillars.
 * Length along X (front = +X), width along Z, wheels on y=0.
 */
export const CAR_YELLOW = "#ffb703";

const dark = new THREE.MeshStandardMaterial({ color: "#2a2d36", roughness: 0.7 });
const chrome = new THREE.MeshStandardMaterial({ color: "#dfe5ea", roughness: 0.25, metalness: 0.8 });
const tire = new THREE.MeshStandardMaterial({ color: "#26262c", roughness: 0.9 });
const hub = new THREE.MeshStandardMaterial({ color: "#c7ced6", roughness: 0.35, metalness: 0.6 });
const glassMat = new THREE.MeshStandardMaterial({ color: "#9fd8ff", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.5, envMapIntensity: 1.5, side: THREE.DoubleSide });
const shine = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
const seatMat = new THREE.MeshStandardMaterial({ color: "#3b3f4c", roughness: 0.9 });
const plate = new THREE.MeshStandardMaterial({ color: "#fdfaf0", roughness: 0.5 });

const Wheel: React.FC<{ x: number; z: number; r?: number; paint: THREE.Material }> = ({ x, z, r = 0.4, paint }) => {
  const s = z > 0 ? 1 : -1;
  return (
    <group position={[x, r, z]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh material={tire}>
          <cylinderGeometry args={[r, r, 0.34, 28]} />
        </mesh>
        <mesh material={hub} position={[0, s * 0.175, 0]}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, 0.02, 24]} />
        </mesh>
        <mesh material={dark} position={[0, s * 0.19, 0]}>
          <cylinderGeometry args={[r * 0.18, r * 0.18, 0.03, 16]} />
        </mesh>
      </group>
      {/* fender flare in body colour */}
      <mesh material={paint} position={[0, 0.04, s * 0.02]} scale={[1, 1, 1]}>
        <torusGeometry args={[r + 0.1, 0.09, 10, 28, Math.PI]} />
      </mesh>
    </group>
  );
};

/** Glass panel with two white diagonal highlight streaks (how cartoons read "glass"). */
const Pane: React.FC<{ w: number; h: number; shapePts?: [number, number][] }> = ({ w, h, shapePts }) => {
  const geo = useMemo(() => {
    if (!shapePts) return new THREE.PlaneGeometry(w, h);
    const s = new THREE.Shape(shapePts.map(([x, y]) => new THREE.Vector2(x, y)));
    return new THREE.ShapeGeometry(s);
  }, [w, h, shapePts]);
  return (
    <group>
      <mesh geometry={geo} material={glassMat} />
      <mesh material={shine} position={[-w * 0.12, 0, 0.004]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[w * 0.09, h * 1.1]} />
      </mesh>
      <mesh material={shine} position={[w * 0.02, 0, 0.004]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[w * 0.035, h * 1.0]} />
      </mesh>
    </group>
  );
};

export const Car: React.FC<{
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lights?: boolean;
  scale?: number;
  windowDown?: number;
  windshieldChildren?: React.ReactNode;
  driver?: boolean;
  driverExpr?: "neutral" | "happy" | "shock" | "worried" | "strain";
}> = ({ color = CAR_YELLOW, position = [0, 0, 0], rotation = [0, 0, 0], lights = true, scale = 1, windowDown = 0, windshieldChildren, driver = true, driverExpr = "neutral" }) => {
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.05, envMapIntensity: 0.8 }), [color]);
  // cabin profile (side view)
  const F = [1.05, 0.95] as const; // windshield base
  const T = [0.42, 1.68] as const; // windshield top
  const RT = [-1.28, 1.68] as const; // roof rear
  const RB = [-1.72, 0.97] as const; // hatch base
  const sideWin: [number, number][] = [
    [F[0] - 0.12, 1.02],
    [T[0] - 0.04, 1.6],
    [RT[0] + 0.02, 1.6],
    [RB[0] + 0.14, 1.02],
  ];
  const wsLen = Math.hypot(F[0] - T[0], T[1] - F[1]);
  const wsAng = Math.atan2(F[0] - T[0], T[1] - F[1]); // lean back from vertical
  const rearLen = Math.hypot(RT[0] - RB[0], RT[1] - RB[1]);
  const rearAng = Math.atan2(RT[0] - RB[0], RT[1] - RB[1]);
  const half = 0.8; // cabin half width
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* chunky lower body */}
      <mesh geometry={rbox(4.25, 0.66, 1.9, 0.3)} material={paint} position={[0, 0.66, 0]} />
      {/* hood bulge + bumpers */}
      <mesh geometry={rbox(1.15, 0.12, 1.6, 0.06)} material={paint} position={[1.55, 1.0, 0]} />
      <mesh geometry={rbox(0.22, 0.26, 1.95, 0.11)} material={dark} position={[2.12, 0.46, 0]} />
      <mesh geometry={rbox(0.22, 0.26, 1.95, 0.11)} material={dark} position={[-2.12, 0.46, 0]} />
      {/* grille */}
      <mesh geometry={rbox(0.06, 0.2, 0.9, 0.05)} material={dark} position={[2.13, 0.76, 0]} />
      {[-0.05, 0.03].map((y) => (
        <mesh key={y} material={chrome} position={[2.165, 0.76 + y, 0]}>
          <boxGeometry args={[0.01, 0.025, 0.82]} />
        </mesh>
      ))}
      <mesh material={plate} geometry={rbox(0.03, 0.15, 0.5, 0.03)} position={[2.24, 0.48, 0]} />
      <mesh material={plate} geometry={rbox(0.03, 0.15, 0.5, 0.03)} position={[-2.24, 0.62, 0]} />
      {/* round headlights + tail lights */}
      {[-0.66, 0.66].map((z) => (
        <group key={z}>
          <mesh position={[2.12, 0.8, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.15, 0.15, 0.06, 24]} />
            <meshStandardMaterial color={lights ? "#fffbe9" : "#cfd6dc"} emissive={lights ? "#fff1c4" : "#000"} emissiveIntensity={lights ? 2 : 0} roughness={0.1} toneMapped={!lights} />
          </mesh>
          <mesh position={[2.1, 0.8, z]} rotation={[0, 0, Math.PI / 2]} material={chrome}>
            <torusGeometry args={[0.16, 0.025, 8, 24]} />
          </mesh>
          {lights && <Glow position={[2.3, 0.8, z]} size={1.0} color="#fff0c8" opacity={0.85} />}
          <mesh geometry={rbox(0.06, 0.22, 0.3, 0.05)} position={[-2.13, 0.9, z]}>
            <meshStandardMaterial color="#e3262e" emissive={lights ? "#ff2020" : "#400000"} emissiveIntensity={lights ? 1.4 : 0.5} roughness={0.25} />
          </mesh>
          {lights && <Glow position={[-2.25, 0.9, z]} size={0.7} color="#ff3030" opacity={0.7} />}
        </group>
      ))}
      {/* side trims, door seams, handles, mirrors */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={rbox(2.6, 0.1, 0.04, 0.03)} material={dark} position={[0, 0.42, s * 0.955]} />
          {[-0.3, 0.98].map((x) => (
            <mesh key={x} material={dark} position={[x, 0.68, s * 0.952]}>
              <boxGeometry args={[0.025, 0.5, 0.01]} />
            </mesh>
          ))}
          {[0.6, -0.85].map((x) => (
            <mesh key={x} material={chrome} geometry={rbox(0.22, 0.05, 0.04, 0.02)} position={[x, 0.85, s * 0.96]} />
          ))}
          <group position={[0.92, 1.12, s * 0.9]}>
            <mesh material={paint} geometry={rbox(0.16, 0.16, 0.24, 0.07)} />
            <mesh material={glassMat} position={[-0.085, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.18, 0.11]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* ---------- glass cabin ---------- */}
      {/* side windows */}
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * half]} rotation={[0, s === 1 ? 0 : Math.PI, 0]} scale={[s === 1 ? 1 : -1, 1, 1]}>
          <Pane w={2.4} h={0.58} shapePts={sideWin} />
          {s === 1 && windowDown > 0 && (
            <mesh position={[-0.1, 1.3, 0.006]} scale={[1.3, 0.55 * windowDown, 1]}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial color="#0a1a24" />
            </mesh>
          )}
        </group>
      ))}
      {/* windshield */}
      <group position={[(F[0] + T[0]) / 2 + 0.01, (F[1] + T[1]) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[-wsAng, 0, 0]}>
          <Pane w={half * 2 - 0.06} h={wsLen} />
          <group position={[0, 0, 0.01]}>{windshieldChildren}</group>
        </group>
      </group>
      {/* rear glass */}
      <group position={[(RT[0] + RB[0]) / 2 - 0.01, (RT[1] + RB[1]) / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group rotation={[rearAng, 0, 0]}>
          <Pane w={half * 2 - 0.06} h={rearLen} />
        </group>
      </group>
      {/* roof + pillars in body colour */}
      <mesh geometry={rbox(RT[0] - T[0] < 0 ? T[0] - RT[0] + 0.12 : 1, 0.1, half * 2 + 0.08, 0.05)} material={paint} position={[(T[0] + RT[0]) / 2, 1.7, 0]} />
      {[1, -1].map((s) => (
        <group key={s}>
          {/* A pillars */}
          <mesh material={paint} position={[(F[0] + T[0]) / 2, (F[1] + T[1]) / 2, s * (half - 0.01)]} rotation={[0, 0, wsAng]}>
            <boxGeometry args={[0.09, wsLen + 0.06, 0.09]} />
          </mesh>
          {/* B pillar */}
          <mesh material={paint} position={[-0.32, 1.32, s * (half + 0.005)]}>
            <boxGeometry args={[0.14, 0.72, 0.06]} />
          </mesh>
          {/* C pillar */}
          <mesh material={paint} position={[(RT[0] + RB[0]) / 2, (RT[1] + RB[1]) / 2, s * (half - 0.01)]} rotation={[0, 0, -rearAng]}>
            <boxGeometry args={[0.16, rearLen + 0.06, 0.09]} />
          </mesh>
        </group>
      ))}
      {/* interior visible through the glass */}
      {[-0.42, 0.42].map((z) => (
        <group key={z}>
          <mesh geometry={rbox(0.16, 0.62, 0.5, 0.06)} material={seatMat} position={[-0.45, 1.25, z]} rotation={[0, 0, 0.12]} />
          <mesh geometry={rbox(0.14, 0.18, 0.28, 0.06)} material={seatMat} position={[-0.5, 1.62, z]} />
        </group>
      ))}
      <mesh geometry={rbox(0.5, 0.12, 1.5, 0.05)} material={dark} position={[0.75, 1.02, 0]} />
      {driver && (
        <HeadSprite expr={driverExpr} position={[-0.15, 1.42, 0.42]} size={0.42} />
      )}
      <Wheel x={1.35} z={0.86} paint={paint} />
      <Wheel x={1.35} z={-0.86} paint={paint} />
      <Wheel x={-1.35} z={0.86} paint={paint} />
      <Wheel x={-1.35} z={-0.86} paint={paint} />
      {lights && <Spot position={[2.3, 0.8, 0]} target={[9, -0.6, 0]} angle={0.45} penumbra={0.7} intensity={14} distance={20} color="#fff1c9" />}
    </group>
  );
};

/** Cartoon box truck, front = +X. */
export const Truck: React.FC<{ position?: [number, number, number]; rotation?: [number, number, number] }> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const box = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f4f6f8", roughness: 0.6 }), []);
  const cab = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a78d6", roughness: 0.4 }), []);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={rbox(5.2, 2.9, 2.45, 0.18)} material={box} position={[-1.2, 2.1, 0]} />
      {[1.235, -1.235].map((z) => (
        <group key={z}>
          <mesh position={[-1.2, 2.0, z]}>
            <planeGeometry args={[4.8, 0.55]} />
            <meshStandardMaterial color="#e2483f" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-1.2, 2.45, z]}>
            <planeGeometry args={[4.8, 0.14]} />
            <meshStandardMaterial color="#f5b83d" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh geometry={rbox(1.95, 1.3, 2.35, 0.3)} material={cab} position={[2.35, 1.0, 0]} />
      <mesh geometry={rbox(1.4, 0.95, 2.3, 0.28)} material={cab} position={[2.1, 2.0, 0]} />
      <group position={[2.82, 2.05, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[-0.25, 0, 0]}>
          <Pane w={2.0} h={0.75} />
        </group>
      </group>
      {[1, -1].map((s) => (
        <group key={s} position={[2.1, 2.05, s * 1.16]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
          <Pane w={0.9} h={0.6} />
        </group>
      ))}
      <mesh material={chrome} geometry={rbox(0.08, 0.5, 1.6, 0.04)} position={[3.33, 0.95, 0]} />
      <mesh material={dark} geometry={rbox(0.25, 0.3, 2.4, 0.1)} position={[3.3, 0.5, 0]} />
      {[-0.85, 0.85].map((z) => (
        <group key={z}>
          <mesh position={[3.33, 1.05, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.16, 0.16, 0.06, 20]} />
            <meshStandardMaterial color="#fffbe9" emissive="#fff1c4" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          <Glow position={[3.5, 1.05, z]} size={1.5} color="#fff0c8" />
        </group>
      ))}
      {[2.6, 0.0, -2.6].map((x) => [1.12, -1.12].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} r={0.55} paint={dark} />))}
      <Spot position={[3.4, 1.0, 0]} target={[12, -0.5, 0]} angle={0.5} penumbra={0.6} intensity={30} distance={26} color="#fff1c9" />
    </group>
  );
};
