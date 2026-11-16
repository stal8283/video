import { useCurrentFrame } from "remotion";
import { useThree } from "@react-three/fiber";
import { Stage } from "./Stage";
import { Cam } from "../three/Camera";
import { Bridge, Rain, River, Sky, Skyline, Splash } from "../three/World";
import { Car, Truck } from "../three/Car";
import { Ambulance, Bubbles, Burst, City, GodRays, Label } from "../three/Props";
import { Figure } from "../three/Figure";
import { clamp, ease, easeIn, easeOut, mix, mix3, twos } from "../three/util";
import type { SceneProps } from "../Video";

const FPS = 30;

/** Rainy blue-hour night: the "normal world" before things go wrong. */
const Dusk: React.FC<{ bright?: number; t?: number }> = ({ bright = 1, t = 0 }) => (
  <>
    <Sky top="#060b1c" mid="#2c4766" bottom="#05101a" />
    <fog attach="fog" args={["#1d3349", 28, 190]} />
    <hemisphereLight args={["#6f8fba", "#0a1820", 0.85 * bright]} />
    <directionalLight position={[-30, 40, -40]} intensity={0.9 * bright} color="#a9bfff" />
    <directionalLight position={[40, 10, 30]} intensity={0.35 * bright} color="#ffb47a" />
    <Skyline t={t} />
  </>
);

/** Turns a group to always face the camera. Must render after <Cam/>. */
const FaceCam: React.FC<{ position: [number, number, number]; children: React.ReactNode }> = ({ position, children }) => {
  const { camera } = useThree();
  return (
    <group position={position} quaternion={camera.quaternion.clone()}>
      {children}
    </group>
  );
};

/* ---------------- 1. HOOK: car flies off the bridge ---------------- */
export const Hook: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const p = Math.max(0, t - 0.15) * 0.72;
  const pi = (2.2 + Math.sqrt(2.2 * 2.2 + 4 * 4.9 * 6.3)) / 9.8;
  const ti = 0.15 + pi / 0.72;
  const zi = 4.6 + 4.5 * pi;
  let pos: [number, number, number];
  let pitch: number;
  if (t < ti) {
    pos = [2, 6.3 + 2.2 * p - 4.9 * p * p, 4.6 + 4.5 * p];
    pitch = 0.12 + 0.62 * p;
  } else {
    const a = t - ti;
    const ai = 0.12 + 0.62 * pi;
    pos = [2, -0.62 + 0.07 * Math.sin(a * 2.2) - 0.9 * Math.exp(-a * 3) * Math.sin(a * 6), zi + 1.2 * (1 - Math.exp(-a * 1.5))];
    pitch = 0.2 + (ai - 0.2) * Math.exp(-a * 2.6) * Math.cos(a * 4);
  }
  const k = ease(clamp(f / dur));
  const shake = t > ti ? Math.exp(-(t - ti) * 4) * 0.12 : 0;
  const camPos = mix3([7.5, 1.7, 25], [5.5, 1.9, 20.5], k).map((v, i) => v + (i === 1 ? Math.sin(t * 40) * shake : 0));
  return (
    <Stage>
      <Cam pos={camPos} look={[2, mix(4.2, 1.6, k), 7]} fov={46} />
      <Dusk t={t} />
      <Bridge y={6} gapX={2} t={t} lampLights={[-4, 10]} />
      <River t={t} ripples={[{ x: 2, z: zi, t0: ti }]} />
      <Car position={pos} rotation={[0, -Math.PI / 2, -pitch]} />
      <Splash age={t - ti} position={[2, 0, zi + 1.5]} size={1.3} />
      <Rain t={t} center={[-4, 8, 14]} area={[30, 20, 26]} />
    </Stage>
  );
};

/* ---------------- 3. TRUCK clips the car, it flies off ---------------- */
export const TruckScene: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const tc = Math.max(0.35, at("clips") / FPS);
  const tf = Math.max(tc + 0.6, at("flying") / FPS - 0.1);
  const v = 13;
  const P0 = [0, 2.2];
  const P1 = [7.5, 2.2];
  const P2 = [11.5, 4.7];
  let x: number, y = 6, z: number, yaw: number, pitch = 0, roll = 0;
  if (t < tc) {
    x = v * (t - tc);
    z = 2.2;
    yaw = 0;
  } else if (t < tf) {
    const s = (t - tc) / (tf - tc);
    const u = 1 - s;
    x = u * u * P0[0] + 2 * u * s * P1[0] + s * s * P2[0];
    z = u * u * P0[1] + 2 * u * s * P1[1] + s * s * P2[1];
    const dx = 2 * u * (P1[0] - P0[0]) + 2 * s * (P2[0] - P1[0]);
    const dz = 2 * u * (P1[1] - P0[1]) + 2 * s * (P2[1] - P1[1]);
    yaw = -Math.atan2(dz, dx) - 0.35 * Math.sin(s * Math.PI);
    roll = 0.05 * Math.sin(s * 20) * (1 - s);
  } else {
    const a = (t - tf) * 0.4; // slow motion once airborne
    const dx = 2 * (P2[0] - P1[0]);
    const dz = 2 * (P2[1] - P1[1]);
    const n = Math.hypot(dx, dz);
    x = P2[0] + (dx / n) * 9 * a;
    z = P2[1] + (dz / n) * 9 * a;
    y = 6 + 3 * a - 4.9 * a * a;
    yaw = -Math.atan2(dz, dx);
    pitch = 0.9 * a;
    roll = -0.5 * a;
  }
  const truckX = t < tc ? -5.7 - (tc - t) * 4 : -5.7 + v * 0.55 * (t - tc) - 3 * (t - tc) * (t - tc);
  const k = ease(clamp(f / dur));
  const air = clamp((t - tf) / 0.6);
  const camX = t < tc ? x - 1.5 : mix(x - 1.5, 9, easeOut(clamp((t - tc) / 1.2)));
  const camPos: [number, number, number] = [camX + mix(0, 2, air), mix(8.5, 9.5, k) + air * 1.5, mix(17, 13, k) + air * 6];
  return (
    <Stage>
      <Cam pos={camPos} look={[mix(x, 11, air * 0.5), mix(6.8, 5.5, air), mix(z, 6, air)]} fov={42} />
      <Dusk t={t} />
      <Bridge y={6} gapX={t > tf - 0.05 ? 11.5 : null} t={t} lampLights={[-4, 10]} />
      <River t={t} />
      <group rotation={[roll, 0, 0]} position={[0, 0, 0]}>
        <Car position={[x, y, z]} rotation={[0, yaw, -pitch]} />
      </group>
      <Truck position={[truckX, 6, 2.2]} />
      <Burst age={t - tc} origin={[-2.1, 6.6, 2.2]} dir={[-2, 3, 1]} spread={0.9} count={70} size={0.05} color="#ffb347" gravity={6} life={0.8} emissive />
      <Burst age={t - tf + 0.05} origin={[11.5, 7, 4.6]} dir={[2, 3, 6]} spread={0.7} count={40} size={0.12} color="#b9c3cc" shape="tri" life={2} />
      <Rain t={t} center={[x + 2, 9, 9]} area={[34, 18, 22]} />
    </Stage>
  );
};

/* ---------------- 4. FLOAT: the car floats, calm ---------------- */
export const Float: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ts = at("slams") / FPS;
  const a = t - ts;
  const k = ease(clamp(f / dur));
  const bob = Math.sin(t * 2) * 0.06;
  const settle = a > 0 ? Math.exp(-a * 2.5) * Math.cos(a * 6) * 0.35 : 0;
  return (
    <Stage>
      <Cam pos={mix3([6.2, 0.75, 7.6], [4.3, 0.95, 5.4], k)} look={[0, mix(0.55, 0.75, k), 0]} fov={42} />
      <Dusk bright={0.9} t={t} />
      <River t={t} amp={0.12} ripples={[{ x: 0, z: 0, t0: ts }, { x: 0.5, z: 0.5, t0: ts + 1.6 }, { x: -1, z: 0.3, t0: ts + 3.2 }]} />
      <Car position={[0, -0.62 + bob - settle * 0.4, 0]} rotation={[0.04 * Math.sin(t * 1.5), -0.65, -0.17 - settle * 0.3]} lights={false} />
      <Splash age={a} position={[0.8, 0, 0.6]} size={0.9} />
      <Rain t={t} center={[3, 5, 3]} area={[16, 12, 14]} count={700} />
      <pointLight position={[3, 3, 3]} intensity={2} distance={12} color="#9fc0ff" />
    </Stage>
  );
};

/* ---------------- 6a. RISING (exterior): sinking, dispatcher bubble ---------------- */
export const RisingExterior: React.FC<{ f: number; dur: number }> = ({ f, dur }) => {
  const t = f / FPS;
  const k = ease(clamp(f / dur));
  const pop = easeOut(clamp(f / 10));
  return (
    <Stage>
      <Cam pos={mix3([2.2, 2.0, 8.4], [1.2, 1.5, 6.4], k)} look={[0.2, 0.4, 0]} fov={40} />
      <Sky top="#04070f" mid="#1b3046" bottom="#03090d" />
      <fog attach="fog" args={["#132636", 14, 120]} />
      <hemisphereLight args={["#5f7fa8", "#06141a", 0.7]} />
      <directionalLight position={[-20, 30, 20]} intensity={0.7} color="#9fb8ff" />
      <pointLight position={[2, 3, 4]} intensity={5} distance={12} color="#8fc3ff" />
      <Skyline t={t} />
      <River t={t} amp={0.1} color="#0c3f45" />
      <Car position={[0, mix(-0.72, -1.05, k) + Math.sin(t * 2) * 0.04, 0]} rotation={[0, 0, -0.12]} lights={false} />
      <Label text="911, where are you?" bubble position={[0.5, 2.0, 0.8]} scale={1.3 * pop} />
      <Rain t={t} center={[1, 5, 3]} area={[14, 12, 12]} count={600} />
    </Stage>
  );
};

/* ---------------- 10. AMBULANCE: crane up to the city ---------------- */
export const AmbulanceScene: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const k = ease(clamp(f / (dur - 4)));
  const k2 = easeIn(clamp(f / dur));
  const amb: [number, number, number] = [-62 + t * 3.2, 0, -50];
  const camPos = mix3([3, 5, 14], [25, 80, 60], k);
  const look = mix3([0, 0, 2], [-25, 0, -25], k);
  // route from ambulance to bridge: along road z=-63, then down x=-8 to the river
  const route: [number, number][] = [];
  for (let x = amb[0] + 4; x < -8; x += 3) route.push([x, -50]);
  for (let z = -50; z < -12; z += 3) route.push([-8, z]);
  return (
    <Stage exposure={1.7}>
      <Cam pos={camPos} look={look} fov={mix(42, 36, k2)} />
      <Sky top="#0d1f3f" mid="#4a6d9c" bottom="#0b1522" />
      <fog attach="fog" args={["#2a4466", 60, 380]} />
      <hemisphereLight args={["#9cb6e0", "#141c28", 1.6]} />
      <directionalLight position={[-60, 80, 40]} intensity={1.0} color="#c5d4ff" />
      <City size={230} rz={[-12, 12]} t={t} />
      <group position={[0, 0, 0]}>
        <River t={t} size={[420, 26]} seg={60} amp={0.12} color="#0e4652" />
      </group>
      <group rotation={[0, Math.PI / 2, 0]} position={[-8, 0, 0]}>
        <Bridge y={4} length={40} />
      </group>
      <Car position={[0, -0.6 + Math.sin(t * 2) * 0.05, 3]} rotation={[0, -0.7, -0.2]} />
      {/* road the ambulance is on */}
      <mesh position={[-60, 0.02, -50]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[140, 7]} />
        <meshStandardMaterial color="#2a2f38" />
      </mesh>
      <Ambulance position={amb} t={t} scale={1.6} />
      {route.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]}>
          <boxGeometry args={[1.4, 0.3, 1.4]} />
          <meshBasicMaterial color="#ff3b3b" toneMapped={false} transparent opacity={clamp((k - 0.35) * 3 - i * 0.02)} />
        </mesh>
      ))}
      <FaceCam position={[amb[0], 18, amb[2]]}>
        <Label text="8+ MIN" sub="AWAY" position={[0, 0, 0]} scale={34 * easeOut(clamp((k - 0.45) * 3))} bg="#ff3b3b" color="#fff" />
      </FaceCam>
      <FaceCam position={[0, 24, 3]}>
        <Label text="YOU" position={[0, 0, 0]} scale={16 * easeOut(clamp((k - 0.55) * 3))} bg="#ffd23f" />
      </FaceCam>
    </Stage>
  );
};

/* ---------------- 13. ESCAPE: swim out and up to the surface ---------------- */
const Underwater: React.FC<{ t: number; depthTint?: number }> = ({ t }) => (
  <>
    <color attach="background" args={["#073b3a"]} />
    <fog attach="fog" args={["#0a4744", 1.5, 22]} />
    <hemisphereLight args={["#7fe7d4", "#021412", 1.0]} />
    <directionalLight position={[2, 20, 4]} intensity={1.4} color="#c9fff0" />
    <GodRays position={[0, 0, -2]} t={t} count={7} opacity={0.1} length={18} />
  </>
);

export const Escape: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const fw = at("window");
  const breach = Math.max(10, fw - 6);
  // figure: from the car window up to the surface
  const s = clamp(f / breach);
  const fy = mix(-5.6, -0.2, easeIn(s) * 0.4 + ease(s) * 0.6) + (f > breach ? Math.min(0.6, (f - breach) * 0.05) : 0);
  const fx = mix(-0.4, 0.2, ease(s));
  const stroke = Math.floor(twos(f, 5) / 5) % 2 ? 1 : -1; // pose-to-pose swim strokes
  const camY = mix(-6.2, 0.35, ease(clamp(f / (breach + 8))));
  const above = camY > 0.02;
  const carY = -7.4 - t * 0.5;
  const arms = above
    ? { armL: [-2.3, 0.35] as [number, number], armR: [2.3, -0.35] as [number, number] }
    : { armL: [-2.1 - stroke * 0.6, 0.4] as [number, number], armR: [2.1 + stroke * 0.6, -0.4] as [number, number] };
  return (
    <Stage exposure={above ? 1.1 : 1.0}>
      <Cam pos={[mix(2.8, 0.6, ease(s)), camY, mix(6.5, 3.6, ease(s))]} look={[fx, fy + (above ? 0.3 : 0.6), 0]} fov={44} roll={above ? 0 : Math.sin(t) * 0.02} />
      {above ? (
        <>
          <Sky top="#0c1a33" mid="#f2a65e" bottom="#0a1a20" />
          <fog attach="fog" args={["#334a63", 20, 160]} />
          <hemisphereLight args={["#ffd2a6", "#0a1820", 1.2]} />
          <directionalLight position={[-20, 8, -30]} intensity={2.2} color="#ffc27a" />
          <Skyline t={t} />
        </>
      ) : (
        <Underwater t={t} />
      )}
      <River t={t} amp={0.1} color={above ? "#155a66" : "#3fa8a0"} doubleSide size={[120, 120]} seg={60} />
      <Car position={[-0.6, carY, -1.5]} rotation={[0.1, -0.35, -0.35]} lights={false} />
      <Bubbles t={t} origin={[-0.4, carY + 1, -1.2]} count={40} height={7} />
      <Bubbles t={t + 3} origin={[fx, fy - 0.4, 0]} count={20} spread={0.5} height={2.5} speed={2.4} />
      <Figure position={[fx, fy, 0]} scale={0.55} expr={above ? "happy" : "determined"} {...arms} legL={[0.3 + stroke * 0.3, 0]} legR={[-0.3 - stroke * 0.3, 0]} mouthOpen={above ? 0.8 : 0} />
      {above && <Rain t={t} center={[0, 4, 0]} area={[10, 8, 8]} count={300} opacity={0.3} />}
    </Stage>
  );
};

