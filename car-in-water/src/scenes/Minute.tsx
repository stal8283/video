import { useCurrentFrame } from "remotion";
import { Stage } from "./Stage";
import { Cam } from "../three/Camera";
import { Sky } from "../three/World";
import { Car } from "../three/Car";
import { Arrow, Label, Stopwatch } from "../three/Props";
import { Figure } from "../three/Figure";
import { clamp, ease, easeOut, mix, mix3 } from "../three/util";
import type { SceneProps } from "../Video";

/* ---------------- 9. EXPLANATION: one-minute clock + water pressure on the door ---------------- */
export const Minute: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / 30;
  const fFl = at("floats");
  const fMin = at("minute");
  const fOnce = at("Once");
  const fDoor = at("door");
  const fPush = at("pushes");
  const fBack = at("back");
  const sweep = ease(clamp((f - fFl) / Math.max(20, fMin + 12 - fFl)));
  const down = ease(clamp((f - fOnce + 6) / 22));
  const water = mix(0.15, 1.12, ease(clamp((f - fOnce) / Math.max(15, fDoor - fOnce + 10))));
  const press = easeOut(clamp((f - fPush) / 12));
  const mine = easeOut(clamp((f - fBack + 4) / 8));
  const camPos = mix3([2.2, 2.9, 13.5], [4.6, 1.6, 6.6], down).map((v, i) => v + (i === 0 ? Math.sin(t * 0.6) * 0.15 : 0));
  const look = mix3([0, 2.3, 0], [-0.1, 0.65, 0.6], down);
  const arrows: React.ReactNode[] = [];
  for (let y = -0.35; y < water - 0.1; y += 0.5) {
    for (let x = -1.3; x <= 1.4; x += 0.9) {
      const depth = clamp((water - y) / 1.6);
      const s = (0.3 + depth * 0.4) * (0.6 + press * 0.6);
      arrows.push(<Arrow key={`${x}${y}`} position={[x, y + 0.15, 1.05 + s * 1.1 + Math.sin(t * 5 + x * 3 + y) * 0.03]} rotation={[0, Math.PI / 2, 0]} l={1} scale={s} color="#ff4747" />);
    }
  }
  return (
    <Stage exposure={1.1}>
      <Cam pos={camPos} look={look} fov={42} />
      <Sky top="#0b2742" mid="#16506a" bottom="#071722" />
      <hemisphereLight args={["#bfe3ff", "#0a1a22", 1.2]} />
      <directionalLight position={[4, 8, 8]} intensity={1.6} color="#ffffff" />
      <directionalLight position={[-6, 3, -4]} intensity={0.6} color="#7fd0ff" />
      <Stopwatch progress={sweep} position={[0, 3.7, 0]} scale={1.15} danger={sweep > 0.95 ? 1 : 0} />
      <Label text="1 MINUTE" position={[0, 5.4, 0.3]} scale={2.1 * easeOut(clamp((f - fMin + 4) / 8))} bg="#ff3b3b" color="#fff" />
      {/* cut-away water block */}
      <mesh position={[0, (water - 3) / 2, 0]}>
        <boxGeometry args={[9, water + 3, 2.2]} />
        <meshStandardMaterial color="#118a8c" transparent opacity={0.42} roughness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[0, water, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 2.2]} />
        <meshStandardMaterial color="#6fe3dc" transparent opacity={0.6} />
      </mesh>
      <Car position={[0, -0.5, 0]} rotation={[0, 0, -0.05]} lights={false} />
      {/* driver visible in the window, pushing back */}
      <Figure position={[-0.35, 0.95, 0.95]} scale={0.32} expr="strain" sweat={1} showBody={false} />
      <Arrow position={[-0.35, 0.9, 1.0]} rotation={[0, -Math.PI / 2, 0]} l={0.6} scale={0.5 * mine} color="#ffffff" />
      {arrows}
    </Stage>
  );
};
