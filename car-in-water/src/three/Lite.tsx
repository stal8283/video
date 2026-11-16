import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Software-WebGL speed-up: swap PBR (MeshStandardMaterial) for Lambert just before each render.
 * Keeps colour/emissive/opacity/map in sync every frame.
 */
const cache = new WeakMap<THREE.Material, THREE.MeshLambertMaterial>();
const sync = (src: THREE.MeshStandardMaterial, dst: THREE.MeshLambertMaterial) => {
  dst.color.copy(src.color);
  dst.emissive.copy(src.emissive);
  dst.emissiveIntensity = src.emissiveIntensity;
  dst.opacity = src.opacity;
  dst.transparent = src.transparent;
  dst.side = src.side;
  dst.depthWrite = src.depthWrite;
  dst.map = src.map;
  dst.flatShading = src.flatShading;
};
const lite = (m: THREE.Material): THREE.Material => {
  if (!(m as THREE.MeshStandardMaterial).isMeshStandardMaterial) return m;
  const s = m as THREE.MeshStandardMaterial;
  let l = cache.get(s);
  if (!l) {
    l = new THREE.MeshLambertMaterial();
    cache.set(s, l);
    sync(s, l);
    l.needsUpdate = true;
  } else sync(s, l);
  // reflective metals read too dark in Lambert: brighten a touch
  if (s.metalness > 0.5) l.color.multiplyScalar(1.15);
  return l;
};

export const LiteMaterials: React.FC = () => {
  useFrame(({ scene }) => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh & { userData: { orig?: THREE.Material | THREE.Material[] } };
      if (!mesh.isMesh) return;
      const orig = (mesh.userData.orig && mesh.material !== mesh.userData.orig && !Array.isArray(mesh.material) && (mesh.material as THREE.Material).type === "MeshLambertMaterial"
        ? mesh.userData.orig
        : mesh.material) as THREE.Material;
      mesh.userData.orig = orig;
      mesh.material = lite(orig);
    });
  });
  return null;
};
