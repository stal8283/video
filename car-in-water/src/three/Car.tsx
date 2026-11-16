import { useMemo } from "react";
import * as THREE from "three";
import { Spot } from "./World";

/** Stylised hatchback. Length along X (front = +X), width along Z, wheels on y=0. */
export const CAR_YELLOW = "#ffb703";

export const Car: React.FC<{
  color?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  lights?: boolean;
  scale?: number;
  windowDown?: number; // 0..1 front-left window lowered
  windshieldChildren?: React.ReactNode;
}> = ({ color = CAR_YELLOW, position = [0, 0, 0], rotation = [0, 0, 0], lights = true, scale = 1, windowDown = 0, windshieldChildren }) => {
  const body = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.05, 0.28);
    s.lineTo(2.0, 0.28);
    s.quadraticCurveTo(2.2, 0.3, 2.18, 0.7);
    s.lineTo(2.1, 0.86);
    s.lineTo(1.25, 0.98);
    s.lineTo(0.55, 1.58);
    s.lineTo(-1.35, 1.6);
    s.quadraticCurveTo(-1.85, 1.55, -2.05, 1.05);
    s.lineTo(-2.12, 0.6);
    s.lineTo(-2.05, 0.28);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.62, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 4, curveSegments: 10 });
    g.translate(0, 0, -0.81);
    return g;
  }, []);
  const sideWin = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.32, 1.04);
    s.lineTo(1.08, 1.04);
    s.lineTo(0.5, 1.5);
    s.lineTo(-1.25, 1.51);
    s.quadraticCurveTo(-1.6, 1.45, -1.72, 1.06);
    s.lineTo(-1.32, 1.04);
    return new THREE.ShapeGeometry(s);
  }, []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#16324a", roughness: 0.08, metalness: 0.6, emissive: "#0b1b2a" }), []);
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.15 }), [color]);
  const wheel = (x: number, z: number) => (
    <group key={`${x}${z}`} position={[x, 0.36, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.3, 24]} />
        <meshStandardMaterial color="#151515" roughness={0.9} />
      </mesh>
      <mesh position={[0, z > 0 ? 0.16 : -0.16, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={body} material={paint} />
      {/* side windows (both sides) */}
      <mesh geometry={sideWin} material={glass} position={[0, 0, 0.905]} />
      <mesh geometry={sideWin} material={glass} position={[0, 0, -0.905]} rotation={[0, Math.PI, 0]} scale={[-1, 1, 1]} />
      {windowDown > 0 && (
        <mesh position={[0.05, 1.28 + 0.01, 0.91]} scale={[1.0, 0.44 * windowDown, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color="#04121c" />
        </mesh>
      )}
      {/* windshield */}
      <mesh position={[0.97, 1.36, 0]} rotation={[0, Math.PI / 2, 0]}>
        <group rotation={[-0.86, 0, 0]}>
          <mesh>
            <planeGeometry args={[1.6, 0.86]} />
            <primitive object={glass} attach="material" />
          </mesh>
          <group position={[0, 0, 0.012]}>{windshieldChildren}</group>
        </group>
      </mesh>
      {/* door seams + handles */}
      {[1, -1].map((side) => (
        <group key={side}>
          <mesh position={[0.3, 1.0, side * 0.915]}>
            <boxGeometry args={[0.28, 0.06, 0.04]} />
            <meshStandardMaterial color="#3b3b3b" metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[-0.35, 0.72, side * 0.913]}>
            <boxGeometry args={[0.02, 0.9, 0.01]} />
            <meshStandardMaterial color="#7a5a00" />
          </mesh>
        </group>
      ))}
      {/* bumpers + trim */}
      <mesh position={[2.18, 0.42, 0]}>
        <boxGeometry args={[0.14, 0.2, 1.7]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh position={[-2.17, 0.42, 0]}>
        <boxGeometry args={[0.14, 0.2, 1.7]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      {/* lights */}
      {[-0.6, 0.6].map((z) => (
        <group key={z}>
          <mesh position={[2.24, 0.72, z]}>
            <boxGeometry args={[0.06, 0.16, 0.38]} />
            <meshBasicMaterial color={lights ? "#fff6d5" : "#777"} toneMapped={false} />
          </mesh>
          <mesh position={[-2.2, 0.85, z]}>
            <boxGeometry args={[0.06, 0.16, 0.32]} />
            <meshBasicMaterial color={lights ? "#ff2a2a" : "#5a1010"} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {wheel(1.35, 0.78)}
      {wheel(1.35, -0.78)}
      {wheel(-1.35, 0.78)}
      {wheel(-1.35, -0.78)}
      {lights && <Spot position={[2.3, 0.75, 0]} target={[8, -0.5, 0]} angle={0.5} penumbra={0.6} intensity={12} distance={18} color="#fff1c9" />}
    </group>
  );
};

/** Box truck, front = +X */
export const Truck: React.FC<{ position?: [number, number, number]; rotation?: [number, number, number] }> = ({ position = [0, 0, 0], rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[-1.2, 2.0, 0]}>
      <boxGeometry args={[5.2, 2.9, 2.4]} />
      <meshStandardMaterial color="#e9edf2" roughness={0.6} />
    </mesh>
    <mesh position={[-1.2, 2.0, 1.21]}>
      <planeGeometry args={[4.6, 0.5]} />
      <meshStandardMaterial color="#d6453d" />
    </mesh>
    <mesh position={[2.35, 1.35, 0]}>
      <boxGeometry args={[1.9, 2.1, 2.3]} />
      <meshStandardMaterial color="#3b6fb6" roughness={0.4} />
    </mesh>
    <mesh position={[2.9, 1.75, 0]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[2.0, 0.8]} />
      <meshStandardMaterial color="#10263a" metalness={0.6} roughness={0.1} />
    </mesh>
    {[-0.8, 0.8].map((z) => (
      <mesh key={z} position={[3.31, 0.9, z]}>
        <boxGeometry args={[0.05, 0.25, 0.4]} />
        <meshBasicMaterial color="#fff6d5" toneMapped={false} />
      </mesh>
    ))}
    {[2.6, 0.2, -2.6].map((x) =>
      [1.1, -1.1].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.5, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.35, 20]} />
          <meshStandardMaterial color="#151515" />
        </mesh>
      )),
    )}
    <Spot position={[3.4, 0.9, 0]} target={[12, -0.5, 0]} angle={0.5} penumbra={0.6} intensity={40} distance={30} color="#fff1c9" />
  </group>
);
