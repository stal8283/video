import { useMemo } from "react";
import * as THREE from "three";
import { Glow, Spot, rbox } from "./World";

/** Stylised hatchback with real detail. Length along X (front = +X), width along Z, wheels on y=0. */
export const CAR_YELLOW = "#ffb703";

const black = new THREE.MeshStandardMaterial({ color: "#16181c", roughness: 0.55, metalness: 0.2 });
const chrome = new THREE.MeshStandardMaterial({ color: "#e6eaee", roughness: 0.12, metalness: 1 });
const tire = new THREE.MeshStandardMaterial({ color: "#1b1b1e", roughness: 0.85 });
const glass = new THREE.MeshPhysicalMaterial({ color: "#0e2232", roughness: 0.04, metalness: 0.25, clearcoat: 1, envMapIntensity: 2.2 });
const plate = new THREE.MeshStandardMaterial({ color: "#f3f1ea", roughness: 0.5 });

const Wheel: React.FC<{ x: number; z: number; r?: number; spin?: number }> = ({ x, z, r = 0.37, spin = 0 }) => {
  const s = z > 0 ? 1 : -1;
  return (
    <group position={[x, r, z]}>
      <group rotation={[Math.PI / 2, spin, 0]}>
        <mesh material={tire}>
          <cylinderGeometry args={[r, r, 0.28, 28]} />
        </mesh>
        <mesh material={tire} position={[0, s * 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r - 0.05, 0.05, 8, 28]} />
        </mesh>
        <mesh material={chrome} position={[0, s * 0.145, 0]}>
          <cylinderGeometry args={[r * 0.62, r * 0.62, 0.02, 24]} />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} material={black} position={[0, s * 0.16, 0]} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
            <boxGeometry args={[0.07, 0.015, r * 1.1]} />
          </mesh>
        ))}
        <mesh material={chrome} position={[0, s * 0.165, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.03, 12]} />
        </mesh>
      </group>
      {/* wheel arch */}
      <mesh material={black} position={[0, 0.02, s * 0.06]} rotation={[0, 0, 0]}>
        <torusGeometry args={[r + 0.09, 0.06, 8, 24, Math.PI]} />
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
}> = ({ color = CAR_YELLOW, position = [0, 0, 0], rotation = [0, 0, 0], lights = true, scale = 1, windowDown = 0, windshieldChildren }) => {
  const body = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.0, 0.32);
    s.lineTo(1.95, 0.32);
    s.bezierCurveTo(2.2, 0.34, 2.22, 0.62, 2.16, 0.8);
    s.bezierCurveTo(2.1, 0.9, 1.7, 0.95, 1.25, 1.0);
    s.bezierCurveTo(0.95, 1.2, 0.75, 1.45, 0.5, 1.56);
    s.bezierCurveTo(0.1, 1.62, -0.9, 1.63, -1.35, 1.6);
    s.bezierCurveTo(-1.8, 1.56, -2.02, 1.3, -2.08, 1.0);
    s.lineTo(-2.12, 0.55);
    s.bezierCurveTo(-2.12, 0.38, -2.08, 0.32, -2.0, 0.32);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.12, bevelSegments: 6, curveSegments: 18 });
    g.translate(0, 0, -0.75);
    return g;
  }, []);
  const sideWin = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.42, 1.06);
    s.lineTo(1.02, 1.06);
    s.bezierCurveTo(0.85, 1.25, 0.65, 1.44, 0.45, 1.5);
    s.lineTo(-1.3, 1.52);
    s.bezierCurveTo(-1.6, 1.48, -1.75, 1.3, -1.8, 1.08);
    s.lineTo(-1.42, 1.06);
    return new THREE.ShapeGeometry(s, 12);
  }, []);
  const paint = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.6 }), [color]);
  const W = 0.875; // half width at the glass line
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={body} material={paint} />
      {/* side glass, B/C pillars */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={sideWin} material={glass} position={[0, 0, s * W]} rotation={[0, s === 1 ? 0 : Math.PI, 0]} scale={[s === 1 ? 1 : -1, 1, 1]} />
          <mesh material={black} position={[-0.35, 1.29, s * (W + 0.005)]}>
            <boxGeometry args={[0.12, 0.47, 0.02]} />
          </mesh>
          {/* lower black trim */}
          <mesh material={black} geometry={rbox(3.0, 0.14, 0.06, 0.03)} position={[0, 0.4, s * 0.88]} />
          {/* door seams */}
          {[-0.35, 0.95].map((x) => (
            <mesh key={x} position={[x, 0.7, s * 0.876]} material={black}>
              <boxGeometry args={[0.015, 0.62, 0.01]} />
            </mesh>
          ))}
          {/* handles */}
          {[0.55, -0.75].map((x) => (
            <mesh key={x} material={chrome} geometry={rbox(0.22, 0.05, 0.04, 0.02)} position={[x, 0.98, s * 0.885]} />
          ))}
          {/* mirror */}
          <group position={[0.95, 1.1, s * 0.98]}>
            <mesh material={black} geometry={rbox(0.08, 0.06, 0.18, 0.02)} position={[0, 0, -s * 0.07]} />
            <mesh material={paint} geometry={rbox(0.2, 0.16, 0.24, 0.06)} />
          </group>
        </group>
      ))}
      {windowDown > 0 && (
        <mesh position={[0.0, 1.3, W + 0.01]} scale={[1.0, 0.44 * windowDown, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#04121c" />
        </mesh>
      )}
      {/* windshield + rear glass */}
      <mesh position={[0.9, 1.33, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[-0.92, 0, 0]}>
          <mesh material={glass}>
            <planeGeometry args={[1.62, 0.78]} />
          </mesh>
          <group position={[0, 0, 0.012]}>{windshieldChildren}</group>
        </group>
      </mesh>
      <mesh position={[-1.78, 1.3, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <group rotation={[-0.55, 0, 0]}>
          <mesh material={glass}>
            <planeGeometry args={[1.45, 0.55]} />
          </mesh>
        </group>
      </mesh>
      {/* front: grille, lights, bumper, plate */}
      <mesh material={black} geometry={rbox(0.12, 0.22, 1.7, 0.05)} position={[2.2, 0.42, 0]} />
      <mesh material={black} geometry={rbox(0.06, 0.2, 0.8, 0.04)} position={[2.23, 0.68, 0]} />
      {[-0.06, 0, 0.06].map((y) => (
        <mesh key={y} material={chrome} position={[2.265, 0.68 + y, 0]}>
          <boxGeometry args={[0.01, 0.015, 0.76]} />
        </mesh>
      ))}
      <mesh material={plate} geometry={rbox(0.03, 0.14, 0.46, 0.02)} position={[2.29, 0.45, 0]} />
      {[-0.62, 0.62].map((z) => (
        <group key={z}>
          <mesh geometry={rbox(0.08, 0.17, 0.42, 0.06)} position={[2.17, 0.8, z]}>
            <meshStandardMaterial color={lights ? "#fffbe9" : "#9aa3ab"} emissive={lights ? "#fff1c4" : "#000000"} emissiveIntensity={lights ? 2.2 : 0} roughness={0.1} toneMapped={!lights} />
          </mesh>
          {lights && <Glow position={[2.35, 0.8, z]} size={1.1} color="#fff0c8" opacity={0.9} />}
          <mesh geometry={rbox(0.08, 0.16, 0.36, 0.05)} position={[-2.17, 0.98, z]}>
            <meshStandardMaterial color="#c3111b" emissive={lights ? "#ff1a1a" : "#300000"} emissiveIntensity={lights ? 1.6 : 0.4} roughness={0.2} />
          </mesh>
          {lights && <Glow position={[-2.3, 0.98, z]} size={0.8} color="#ff2a2a" opacity={0.75} />}
        </group>
      ))}
      <mesh material={black} geometry={rbox(0.12, 0.24, 1.7, 0.05)} position={[-2.15, 0.45, 0]} />
      <mesh material={plate} geometry={rbox(0.03, 0.14, 0.46, 0.02)} position={[-2.23, 0.66, 0]} />
      <Wheel x={1.32} z={0.8} />
      <Wheel x={1.32} z={-0.8} />
      <Wheel x={-1.32} z={0.8} />
      <Wheel x={-1.32} z={-0.8} />
      {lights && <Spot position={[2.3, 0.78, 0]} target={[9, -0.6, 0]} angle={0.45} penumbra={0.7} intensity={14} distance={20} color="#fff1c9" />}
    </group>
  );
};

/** Box truck, front = +X, with real detail. */
export const Truck: React.FC<{ position?: [number, number, number]; rotation?: [number, number, number] }> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const box = useMemo(() => new THREE.MeshStandardMaterial({ color: "#eef1f4", roughness: 0.55, metalness: 0.1 }), []);
  const cab = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2f63b0", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }), []);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={rbox(5.2, 2.9, 2.45, 0.12)} material={box} position={[-1.2, 2.05, 0]} />
      {[1.23, -1.23].map((z) => (
        <group key={z}>
          <mesh position={[-1.2, 2.0, z]}>
            <planeGeometry args={[4.8, 0.55]} />
            <meshStandardMaterial color="#d6453d" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-1.2, 2.45, z]}>
            <planeGeometry args={[4.8, 0.12]} />
            <meshStandardMaterial color="#f2b33d" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh geometry={rbox(1.95, 2.1, 2.35, 0.22)} material={cab} position={[2.35, 1.4, 0]} />
      <mesh position={[3.33, 1.85, 0]} rotation={[0, Math.PI / 2, 0]} material={glass}>
        <planeGeometry args={[2.0, 0.8]} />
      </mesh>
      <mesh material={chrome} geometry={rbox(0.08, 0.5, 1.6, 0.04)} position={[3.33, 0.95, 0]} />
      {[-0.1, 0, 0.1].map((y) => (
        <mesh key={y} material={black} position={[3.38, 0.95 + y, 0]}>
          <boxGeometry args={[0.01, 0.03, 1.5]} />
        </mesh>
      ))}
      <mesh material={black} geometry={rbox(0.25, 0.3, 2.4, 0.06)} position={[3.3, 0.55, 0]} />
      {[-0.85, 0.85].map((z) => (
        <group key={z}>
          <mesh geometry={rbox(0.06, 0.26, 0.4, 0.06)} position={[3.33, 1.0, z]}>
            <meshStandardMaterial color="#fffbe9" emissive="#fff1c4" emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          <Glow position={[3.5, 1.0, z]} size={1.5} color="#fff0c8" />
          <mesh material={black} position={[2.2, 2.0, z * 1.42]} geometry={rbox(0.1, 0.4, 0.1, 0.03)} />
        </group>
      ))}
      {[2.6, 0.0, -2.6].map((x) =>
        [1.1, -1.1].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} r={0.52} />),
      )}
      <Spot position={[3.4, 1.0, 0]} target={[12, -0.5, 0]} angle={0.5} penumbra={0.6} intensity={30} distance={26} color="#fff1c9" />
    </group>
  );
};
