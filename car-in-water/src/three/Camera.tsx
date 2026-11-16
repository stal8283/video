import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Sets the camera every frame from Remotion's frame-derived values (deterministic). */
export const Cam: React.FC<{ pos: number[]; look: number[]; fov?: number; roll?: number }> = ({ pos, look, fov = 40, roll = 0 }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.up.set(Math.sin(roll), Math.cos(roll), 0);
  cam.lookAt(look[0], look[1], look[2]);
  if (cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  return null;
};

export const Bg: React.FC<{ color: string; fog?: [string, number, number] }> = ({ color, fog }) => (
  <>
    <color attach="background" args={[color]} />
    {fog ? <fog attach="fog" args={fog} /> : null}
  </>
);
