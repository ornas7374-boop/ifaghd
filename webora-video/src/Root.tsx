import { Composition } from "remotion";
import { FPS, WIDTH, HEIGHT } from "./theme";
import { WeboraVideo, TOTAL_FRAMES } from "./Video";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WeboraPitch"
        component={WeboraVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
