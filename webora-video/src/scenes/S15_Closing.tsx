import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Logo } from "../components/Logo";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useFloat } from "../utils";

// Scene 15 — Closing (6s / 180 frames)
export const S15_Closing: React.FC = () => {
  const float = useFloat(8, 110);

  return (
    <AbsoluteFill>
      <Backdrop intensity={1.5} />
      <SceneTag label="CLOSING" index={15} />

      <div style={{ position: "absolute", top: 160, left: 0, right: 0, textAlign: "center" }}>
        <SlideIn from="bottom" delay={4} distance={30}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 22, color: COLORS.mint, letterSpacing: "0.3em" }}>
            THE FINAL WORD · الختام
          </div>
        </SlideIn>
        <SlideIn from="bottom" delay={10} distance={24}>
          <h1
            style={{
              fontFamily: FONTS.displayEN,
              fontWeight: 700,
              fontSize: 72,
              color: COLORS.white,
              margin: "18px 0 0 0",
              lineHeight: 1.1,
            }}
          >
            <TypeReveal text="The MENA web deserves better." startFrame={14} perChar={1.1} />
          </h1>
        </SlideIn>
      </div>

      {/* Massive centered wordmark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SlideIn delay={40}>
          <div style={{ transform: `translateY(${float}px)` }}>
            <Logo size={320} bilingual pulse />
          </div>
        </SlideIn>
      </div>

      {/* Tagline */}
      <SlideIn from="bottom" delay={80} distance={30}>
        <div
          style={{
            position: "absolute",
            bottom: 250,
            left: 0,
            right: 0,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.displayEN,
              fontStyle: "italic",
              fontSize: 40,
              color: COLORS.cream,
              maxWidth: 1200,
              margin: "0 auto",
              lineHeight: 1.3,
            }}
          >
            <TypeReveal
              text={`"Let's build something with an aura."`}
              startFrame={90}
              perChar={1.4}
            />
          </div>
        </div>
      </SlideIn>

      {/* Contact block */}
      <SlideIn from="bottom" delay={120} distance={30}>
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "center",
            gap: 60,
            padding: "22px 40px",
            borderTop: `1px solid ${COLORS.panelBorder}`,
          }}
        >
          {[
            { icon: "◈", value: "webora.io" },
            { icon: "✉", value: "hello@webora.io" },
            { icon: "@", value: "@webora" },
            { icon: "☎", value: "+966 XX XXX XXXX" },
          ].map((c) => (
            <div
              key={c.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: FONTS.mono,
                fontSize: 22,
                color: COLORS.cream,
              }}
            >
              <span style={{ color: COLORS.mint }}>{c.icon}</span>
              {c.value}
            </div>
          ))}
        </div>
      </SlideIn>

      <FooterMark page="15 / 15" />
    </AbsoluteFill>
  );
};
