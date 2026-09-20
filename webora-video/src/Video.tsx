import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import "./fonts";
import { FPS, SCENES } from "./theme";

import { S01_Cover } from "./scenes/S01_Cover";
import { S02_Problem } from "./scenes/S02_Problem";
import { S03_Data } from "./scenes/S03_Data";
import { S04_Solution } from "./scenes/S04_Solution";
import { S05_HowItWorks } from "./scenes/S05_HowItWorks";
import { S06_Tiers } from "./scenes/S06_Tiers";
import { S07_Market } from "./scenes/S07_Market";
import { S08_Competition } from "./scenes/S08_Competition";
import { S09_Traction } from "./scenes/S09_Traction";
import { S10_Model } from "./scenes/S10_Model";
import { S11_GTM } from "./scenes/S11_GTM";
import { S12_Financials } from "./scenes/S12_Financials";
import { S13_Team } from "./scenes/S13_Team";
import { S14_Ask } from "./scenes/S14_Ask";
import { S15_Closing } from "./scenes/S15_Closing";

const SCENE_COMPONENTS = [
  S01_Cover,
  S02_Problem,
  S03_Data,
  S04_Solution,
  S05_HowItWorks,
  S06_Tiers,
  S07_Market,
  S08_Competition,
  S09_Traction,
  S10_Model,
  S11_GTM,
  S12_Financials,
  S13_Team,
  S14_Ask,
  S15_Closing,
];

/**
 * The full Webora pitch as motion graphics. Every scene renders on a shared
 * Backdrop so the video reads as one continuous world, not a slideshow.
 * Scenes overlap by 8 frames for a soft cross-fade between them.
 */
export const WeboraVideo: React.FC = () => {
  const { fps } = useVideoConfig();
  const CROSS = 8; // overlap frames for cross-fade
  let cursor = 0;

  return (
    <AbsoluteFill style={{ background: "#0A0E27" }}>
      {SCENES.map((sc, i) => {
        const Comp = SCENE_COMPONENTS[i];
        const dur = sc.dur * fps;
        const from = cursor;
        cursor += dur - CROSS;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={dur} name={sc.id}>
            <Comp />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const TOTAL_FRAMES = SCENES.reduce((sum, sc, i) => sum + sc.dur * FPS - (i > 0 ? 8 : 0), 0);
