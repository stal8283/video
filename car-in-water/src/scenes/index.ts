import type { SceneId } from "../script";
import type { SceneProps } from "../Video";
import { AmbulanceScene, Escape, Float, Hook, TruckScene } from "./Exterior";
import { Door, Driving, Glass, PhoneScene, Rising, Rule, Wait } from "./InteriorScenes";
import { Minute } from "./Minute";

export const SCENE_COMPONENTS: Record<SceneId, React.FC<SceneProps>> = {
  hook: Hook,
  driving: Driving,
  truck: TruckScene,
  float: Float,
  phone: PhoneScene,
  rising: Rising,
  door: Door,
  wait: Wait,
  minute: Minute,
  ambulance: AmbulanceScene,
  rule: Rule,
  glass: Glass,
  escape: Escape,
};
