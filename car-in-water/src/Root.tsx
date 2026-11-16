import { Composition } from "remotion";
import { Video } from "./Video";
import { FPS, TOTAL } from "./timing";

export const Root: React.FC = () => (
  <Composition id="CarInWater" component={Video} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
