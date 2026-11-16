import { useCurrentFrame } from "remotion";
import { Stage, XFade } from "./Stage";
import { Cam } from "../three/Camera";
import { Interior, Phone } from "../three/Interior";
import { ik, SHOULDER_L, SHOULDER_R } from "../three/Figure";
import { Arrow, Burst, Cracks, Hammer, Label } from "../three/Props";
import { Car } from "../three/Car";
import { GodRays, Bubbles } from "../three/Props";
import { clamp, ease, easeOut, FONT, mix, mix3, useTextTexture } from "../three/util";
import type { SceneProps } from "../Video";
import { RisingExterior } from "./Exterior";

const FPS = 30;
// Driver figure transform inside the cabin (see Interior): origin (-0.42, 0.78, -0.2), scale 0.4
const toLocal = (x: number, y: number): [number, number] => [(x + 0.42) / 0.4, (y - 0.78) / 0.4];
const WHEEL_ARMS = { armL: ik(SHOULDER_L, [-0.3, -0.42], -1), armR: ik(SHOULDER_R, [0.3, -0.42], 1) };

const talk = (t: number) => Math.max(0, Math.sin(t * 13) * Math.sin(t * 5.3)) * 0.9;

/* ---------------- 2. DRIVING: warm, cosy, normal ---------------- */
export const Driving: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const k = ease(clamp(f / dur));
  const fc = at("coffee");
  const c = ease(clamp((f - fc + 4) / 14));
  const sweepZ = 2.2 - ((t * 1.1) % 1) * 5;
  return (
    <Stage exposure={1.05}>
      <Cam pos={mix3([-0.1, 1.3, 1.75], [-0.28, 1.2, 1.35], k)} look={[mix(-0.42, -0.1, c), mix(1.08, 0.72, c), mix(-0.2, 0.2, c)]} fov={50} />
      <Interior
        t={t}
        outside="road"
        driver={{ expr: "happy", ...WHEEL_ARMS, rotation: [0, 0, Math.sin(t * 3) * 0.03], blink: f % 75 < 3, look: [0.2, 0.3] }}
        ambient="#3e4d6b"
        ambientI={0.8}
        dash="#ffa24a"
        dashI={5}
      >
        {/* coffee */}
        <group position={[0.0, 0.6, 0.32]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.05, 0.16, 20]} />
            <meshStandardMaterial color="#f3efe6" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.025, 20]} />
            <meshStandardMaterial color="#3b2a1f" />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.062, 0.058, 0.05, 20]} />
            <meshStandardMaterial color="#8a5a35" />
          </mesh>
          {/* steam */}
          {[0, 1, 2].map((i) => {
            const y = ((t * 0.25 + i / 3) % 1) * 0.3;
            return (
              <mesh key={i} position={[Math.sin(t * 3 + i) * 0.02, 0.14 + y, 0]}>
                <sphereGeometry args={[0.02 + y * 0.08, 8, 6]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.25 * (1 - y / 0.3)} />
              </mesh>
            );
          })}
        </group>
        {/* passing street-light sweep */}
        <pointLight position={[-1.4, 1.9, sweepZ]} intensity={5} distance={3.5} color="#ffbf70" />
      </Interior>
    </Stage>
  );
};

/* ---------------- 5. PHONE: grab the phone, dial 911 ---------------- */
const useScreens = () => {
  const draw = (digits: string, calling: boolean) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, calling ? "#0f7a3a" : "#0d1b33");
    g.addColorStop(1, calling ? "#0a3d20" : "#08101f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (calling) {
      ctx.font = `700 60px ${FONT}`;
      ctx.fillText("calling...", w / 2, h * 0.2);
      ctx.font = `900 190px ${FONT}`;
      ctx.fillText("911", w / 2, h * 0.36);
      ctx.fillStyle = "#e3262e";
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.82, 70, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.font = `900 170px ${FONT}`;
    ctx.fillText(digits, w / 2, h * 0.17);
    ctx.font = `700 70px ${FONT}`;
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
    keys.forEach((k, i) => {
      const x = w * (0.22 + (i % 3) * 0.28);
      const y = h * (0.36 + Math.floor(i / 3) * 0.12);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath();
      ctx.arc(x, y, 62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(k, x, y + 4);
    });
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.88, 62, 0, Math.PI * 2);
    ctx.fill();
  };
  return [
    useTextTexture(draw("", false), 512, 1024),
    useTextTexture(draw("9", false), 512, 1024),
    useTextTexture(draw("91", false), 512, 1024),
    useTextTexture(draw("911", false), 512, 1024),
    useTextTexture(draw("", true), 512, 1024),
  ];
};

export const PhoneScene: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const screens = useScreens();
  const fg = at("grab");
  const fd = at("dial");
  const f9 = at("911");
  const raise = ease(clamp((f - fg + 6) / 14));
  const idx = f < fd ? 0 : f < f9 ? 1 : f < f9 + 5 ? 2 : f < f9 + 14 ? 3 : 4;
  const k = ease(clamp(f / dur));
  const phonePos = mix3([0.05, 0.62, 0.15], [-0.18, 1.0, 0.05], raise);
  const hand = toLocal(phonePos[0] - 0.02, phonePos[1] - 0.12);
  return (
    <Stage>
      <Cam pos={mix3([0.05, 1.28, 1.6], [-0.2, 1.12, 1.0], k)} look={mix3([-0.35, 1.05, -0.2], [-0.27, 1.02, -0.1], k)} fov={46} />
      <Interior
        t={t}
        outside="water"
        outsideLevel={0.98}
        rainOnGlass
        driver={{
          expr: raise > 0.5 ? "smug" : "neutral",
          look: raise > 0.5 ? [0.6, -0.4] : [0, 0],
          armL: WHEEL_ARMS.armL,
          armR: ik(SHOULDER_R, hand, 1),
          blink: f % 60 < 3,
        }}
        ambient="#33496b"
        ambientI={0.7}
        dash="#ff9a3c"
        dashI={3}
        windowColor="#08121f"
      >
        <Phone tex={screens[idx]} position={phonePos} rotation={[mix(-1.2, -0.15, raise), mix(0, 0.5, raise), 0]} scale={0.42} />
      </Interior>
    </Stage>
  );
};

/* ---------------- 6. RISING: exterior bubble -> interior water past the handle ---------------- */
const RisingInterior: React.FC<{ f: number; dur: number; tex: import("three").Texture }> = ({ f, dur, tex }) => {
  const t = f / FPS;
  const k = ease(clamp(f / dur));
  const ear = toLocal(-0.12, 1.2);
  return (
    <Stage>
      <Cam pos={mix3([0.4, 1.3, 1.3], [0.05, 1.12, 0.75], k)} look={mix3([-0.55, 1.08, 0], [-0.85, 1.0, 0.25], k)} fov={46} />
      <Interior
        t={t}
        outside="water"
        outsideLevel={mix(1.0, 1.45, k)}
        insideLevel={mix(0.02, 0.14, k)}
        driver={{ expr: "worried", mouthOpen: talk(t), look: [0.8, 0.3], armL: WHEEL_ARMS.armL, armR: ik(SHOULDER_R, ear, 1) }}
        ambient="#2c5560"
        ambientI={0.8}
        dash="#ff9a3c"
        dashI={2}
        windowColor="#050c14"
      >
        <Phone tex={tex} position={[-0.16, 1.24, -0.12]} rotation={[0, -0.4, 0.2]} scale={0.4} />
        <Label text="Uhh... the..." sub="Maple... something?" bubble position={[0.12, 1.55, -0.1]} scale={0.62 * easeOut(clamp((f - 8) / 10))} />
      </Interior>
    </Stage>
  );
};

export const Rising: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const screens = useScreens();
  const cut = at("while");
  return <XFade f={f} at={cut - 8} a={<RisingExterior f={f} dur={cut} />} b={<RisingInterior f={Math.max(0, f - cut + 8)} dur={dur - cut + 8} tex={screens[4]} />} />;
};

/* ---------------- 7. DOOR: push, it won't move ---------------- */
export const Door: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const k = ease(clamp(f / dur));
  const beats = [at("push"), at("won't"), at("Not")];
  const shove = beats.reduce((s, b) => s + Math.max(0, Math.exp(-(f - b) / 5) * (f >= b ? 1 : 0)), 0);
  const h = toLocal(-0.86, 0.98);
  const lean = 0.12 + shove * 0.08;
  return (
    <Stage>
      <Cam pos={mix3([0.3, 1.28, 1.55], [0.1, 1.18, 1.15], k).map((v, i) => v + (i === 0 ? Math.sin(f * 2.1) * shove * 0.01 : 0))} look={[-0.55, 0.98, -0.1]} fov={54} />
      <Interior
        t={t}
        outside="water"
        outsideLevel={1.54}
        insideLevel={0.24}
        driver={{
          expr: "strain",
          sweat: 1,
          look: [-1, 0],
          armL: ik(SHOULDER_L, [h[0] + 0.2, h[1]], 1),
          armR: ik(SHOULDER_R, [h[0] + 0.4, h[1] + 0.1], 1),
          rotation: [0, 0, lean],
          position: [-0.42 - shove * 0.03, 0.78, -0.2],
        }}
        ambient="#1f5a55"
        ambientI={0.9}
        dash="#ff8a3c"
        dashI={1.2}
        windowColor="#03080c"
      >
        {[0.75, 1.05, 1.35].map((y, i) =>
          [-0.3, 0.3].map((z) => (
            <Arrow key={`${y}${z}`} position={[-1.75 + Math.sin(t * 6 + i) * 0.05, y, z]} l={0.75} color="#ff3030" scale={0.75 + i * 0.1} onTop />
          )),
        )}
      </Interior>
    </Stage>
  );
};

/* ---------------- 8. WAIT, WHAT? ---------------- */
export const Wait: React.FC<SceneProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const k = easeOut(clamp(f / dur));
  return (
    <Stage>
      <Cam pos={mix3([-0.28, 1.22, 0.95], [-0.4, 1.18, 0.55], k)} look={[-0.42, 1.15, -0.2]} fov={44} roll={mix(0, 0.06, k)} />
      <Interior t={t} outside="water" outsideLevel={1.56} insideLevel={0.28} driver={{ expr: "shock", sweat: 1 }} ambient="#3a3a5a" ambientI={0.9} dash="#ff3b3b" dashI={3} windowColor="#03080c" />
    </Stage>
  );
};

/* ---------------- 11. RULE: seatbelt, window, kids, you ---------------- */
export const Rule: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const fS = at("Seatbelt");
  const fW = at("Window");
  const fK = at("Kids");
  const fY = at("Then");
  const belt = 1 - ease(clamp((f - fS) / 8));
  const win = ease(clamp((f - fW) / 14));
  const kid = ease(clamp((f - fK) / Math.max(10, fY - fK)));
  const me = ease(clamp((f - fY) / 18));
  const inside = mix(0.22, 0.6, ease(clamp((f - fW) / 60)));
  // camera beats: wide -> belt -> window -> kid -> window
  const shots: [number, [number, number, number], [number, number, number]][] = [
    [0, [0.35, 1.38, 1.7], [-0.15, 1.0, -0.5]],
    [fS, [0.05, 1.2, 1.15], [-0.42, 0.9, -0.2]],
    [fW, [0.3, 1.25, 1.05], [-0.8, 1.15, 0]],
    [fK, [0.4, 1.35, 1.2], [0.0, 1.05, -0.8]],
    [fY, [0.2, 1.3, 1.1], [-0.75, 1.2, -0.1]],
  ];
  let pos = shots[0][1];
  let look = shots[0][2];
  for (let i = 1; i < shots.length; i++) {
    const s = ease(clamp((f - shots[i][0] + 4) / 12));
    pos = mix3(pos, shots[i][1], s);
    look = mix3(look, shots[i][2], s);
  }
  const drift = k(f, dur);
  const kidPos: [number, number, number] = [mix(0.45, -0.75, kid) - (kid > 0.85 ? (kid - 0.85) * 4 : 0), mix(0.66, 1.25, kid), mix(-1.05, -0.2, kid)];
  const drv = toLocal(-0.86, 1.25);
  return (
    <Stage exposure={1.05}>
      <Cam pos={[pos[0] + drift * 0.05, pos[1], pos[2] - drift * 0.1]} look={look} fov={50} />
      <Interior
        t={t}
        outside="water"
        outsideLevel={1.28}
        insideLevel={inside}
        windowDown={win}
        seatbelt={belt}
        kid={kid < 0.98 ? { expr: "determined", position: kidPos, armL: [-2.2, 0.3], armR: [2.2, -0.3] } : null}
        driver={{
          expr: "determined",
          look: [-1, 0.2],
          armL: me > 0 ? ik(SHOULDER_L, [drv[0], drv[1] + 0.3], 1) : belt < 1 && belt > 0 ? ik(SHOULDER_L, [0.3, -0.35], -1) : WHEEL_ARMS.armL,
          armR: me > 0 ? ik(SHOULDER_R, [drv[0] + 0.4, drv[1] + 0.3], 1) : WHEEL_ARMS.armR,
          position: [mix(-0.42, -0.72, me), mix(0.78, 0.98, me), mix(-0.2, -0.05, me)],
          rotation: [0, 0, mix(0, 0.5, me)],
        }}
        ambient="#2a5a62"
        ambientI={0.95}
        dash="#ff9a3c"
        dashI={1.5}
        windowColor="#0a1622"
      >
        {/* water pouring in through the open window */}
        {f > fW + 6 &&
          [0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70].map((d) => (
            <Burst key={d} age={((f - fW - 6 - d) / FPS) % 2.5} origin={[-0.9, 1.0, 0]} dir={[1.6, 0.6, 0]} spread={0.25} count={30} size={0.022} color="#9ff5ee" seed={d} life={0.7} emissive />
          ))}
        {/* hope light through the window */}
        <pointLight position={[-1.3, 1.6, 0]} intensity={win * 4} distance={3} color="#cfffe9" />
      </Interior>
    </Stage>
  );
};
const k = (f: number, dur: number) => ease(clamp(f / dur));

/* ---------------- 12. GLASS: smash the side glass, never the windshield ---------------- */
const GlassInside: React.FC<{ f: number; dur: number; fSm: number }> = ({ f, dur, fSm }) => {
  const t = f / FPS;
  const kk = ease(clamp(f / dur));
  // hammer: wind up, strike lower-front corner at fSm
  const wind = ease(clamp((f - fSm + 14) / 8));
  const hit = ease(clamp((f - fSm + 4) / 4));
  const impact: [number, number, number] = [-0.86, 1.03, 0.45];
  const hp = mix3(mix3([-0.2, 0.95, 0.55], [-0.3, 1.45, 0.6], wind), impact, hit);
  const broken = f > fSm + 3;
  return (
    <Stage>
      <Cam pos={mix3([0.3, 1.3, 1.45], [0.1, 1.22, 1.15], kk).map((v, i) => v + (f > fSm && f < fSm + 6 ? Math.sin(f * 3) * 0.012 : 0) * (i === 1 ? 1 : 0))} look={[-0.5, 1.08, 0.0]} fov={52} />
      <Interior
        t={t}
        outside="water"
        outsideLevel={1.62}
        insideLevel={0.35}
        windowDown={broken ? 1 : 0}
        driver={{ expr: "determined", look: [-1, 0.3], armL: ik(SHOULDER_L, toLocal(hp[0] + 0.25, hp[1] - 0.02), 1), armR: ik(SHOULDER_R, toLocal(-0.3, 0.75), 1) }}
        ambient="#215a58"
        ambientI={1}
        dash="#ff9a3c"
        dashI={1}
        windowColor="#03080c"
      >
        <Hammer position={hp} rotation={[0, 0.2, mix(0.3, -0.2, hit)]} scale={0.38} />
        {!broken && f > fSm - 1 && <Cracks amount={1} w={1.22} h={0.56} position={[-0.905, 1.24, 0]} rotation={[0, Math.PI / 2, 0]} center={[0.13, 0.16]} />}
        <Burst age={(f - fSm - 3) / FPS} origin={[-0.88, 1.24, 0.1]} dir={[2.2, 0.8, 0]} spread={0.7} count={90} size={0.022} color="#e9fbff" shape="tri" life={1.2} gravity={4} emissive />
        {broken && [0, 6, 12, 18, 24, 30, 36].map((d) => <Burst key={d} age={((f - fSm - 3 - d) / FPS) % 1.4} origin={[-0.9, 1.25, 0]} dir={[2.5, 0.2, 0]} spread={0.35} count={40} size={0.025} color="#9ff5ee" seed={d} life={0.6} gravity={3} emissive />)}
      </Interior>
    </Stage>
  );
};

const WindshieldOutside: React.FC<{ f: number; dur: number; fB: number }> = ({ f, dur, fB }) => {
  const t = f / FPS;
  const kk = ease(clamp(f / dur));
  const hit = clamp((f - fB + 5) / 5);
  const back = clamp((f - fB) / 8);
  const hp: [number, number, number] = mix3(mix3([0.9, 1.6, 2.4], [0.25, 1.32, 1.12], ease(hit)), [0.9, 1.8, 2.4], easeOut(back));
  const xs = easeOut(clamp((f - 4) / 8));
  return (
    <Stage>
      <Cam pos={mix3([1.6, 2.4, 8.6], [1.0, 2.0, 6.8], kk)} look={[0, 1.15, 0.8]} fov={42} />
      <color attach="background" args={["#073b3a"]} />
      <fog attach="fog" args={["#0a4744", 2, 16]} />
      <hemisphereLight args={["#7fe7d4", "#021412", 1.1]} />
      <directionalLight position={[2, 10, 6]} intensity={1.6} color="#c9fff0" />
      <GodRays position={[0, 8, -2]} t={t} count={6} opacity={0.08} length={14} />
      <Bubbles t={t} origin={[0, 0.5, 0.5]} count={30} height={5} />
      <Car
        position={[0, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        lights={false}
        windshieldChildren={
          <>
            {f > fB && <Cracks amount={1} w={1.5} h={0.8} position={[0, 0, 0]} center={[0.62, 0.55]} web />}
            <group scale={xs}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[1.0, 0.13, 0.02]} />
                <meshBasicMaterial color="#ff2d2d" toneMapped={false} />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[1.0, 0.13, 0.02]} />
                <meshBasicMaterial color="#ff2d2d" toneMapped={false} />
              </mesh>
            </group>
          </>
        }
      />
      <Hammer position={hp} rotation={[0, Math.PI / 2 + 0.3, -0.3]} scale={1.3} />
    </Stage>
  );
};

export const Glass: React.FC<SceneProps> = ({ dur, at }) => {
  const f = useCurrentFrame();
  const fSm = at("smash");
  const fN = at("Never");
  const fB = at("built");
  return (
    <XFade
      f={f}
      at={fN - 6}
      a={<GlassInside f={f} dur={fN} fSm={fSm} />}
      b={<WindshieldOutside f={Math.max(0, f - fN + 6)} dur={dur - fN + 6} fB={fB - fN + 6} />}
    />
  );
};

