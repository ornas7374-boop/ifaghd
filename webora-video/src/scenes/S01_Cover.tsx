import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Logo } from "../components/Logo";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useFloat } from "../utils";

// Scene 1 — Cover (4s / 120 frames)
export const S01_Cover: React.FC = () => {
  const frame = useCurrentFrame();
  const float = useFloat(6, 100);
  const scanline = ((frame * 3) % 1080) - 200;

  return (
    <AbsoluteFill>
      <Backdrop intensity={1.4} />
      <SceneTag label="COVER" index={1} />

      {/* Scanning highlight line — motion, not decoration */}
      <div
        style={{
          position: "absolute",
          top: scanline,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.mint}, transparent)`,
          opacity: 0.35,
        }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 40 }}>
        <SlideIn from="bottom" delay={4} distance={60}>
          <div style={{ transform: `translateY(${float}px)` }}>
            <Logo size={220} bilingual pulse />
          </div>
        </SlideIn>

        <SlideIn from="bottom" delay={20} distance={30}>
          <div
            style={{
              fontFamily: FONTS.displayEN,
              fontWeight: 500,
              fontSize: 44,
              color: COLORS.mint,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              marginTop: 24,
            }}
          >
            <TypeReveal text="Websites with an aura." startFrame={30} perChar={1.5} />
          </div>
        </SlideIn>

        <SlideIn from="bottom" delay={44} distance={24}>
          <div
            style={{
              fontFamily: FONTS.displayAR,
              fontSize: 40,
              color: COLORS.cream,
              direction: "rtl",
              opacity: 0.9,
            }}
          >
            مواقع لها حضور
          </div>
        </SlideIn>
      </AbsoluteFill>

      <FooterMark page="PITCH DECK · SEPTEMBER 2026" />
    </AbsoluteFill>
  );
};
