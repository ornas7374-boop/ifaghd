import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { AuraDot } from "../components/AuraDot";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useFloat } from "../utils";

// Scene 4 — The Solution (5s / 150 frames)
export const S04_Solution: React.FC = () => {
  const float = useFloat(4, 90);
  const pillars = [
    { emoji: "⚡", en: "7–21 days", ar: "يوم تسليم — مضمون", tag: "SPEED" },
    { emoji: "◈", en: "Fixed prices", ar: "5,999 / 12,999 / 24,999 SAR", tag: "PRICE" },
    { emoji: "◐", en: "Arabic-native", ar: "ثنائي اللغة من الأساس", tag: "BILINGUAL" },
  ];

  return (
    <AbsoluteFill>
      <Backdrop intensity={1.2} />
      <SceneTag label="SOLUTION" index={4} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72, display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ transform: `translateY(${float}px)` }}>
          <SlideIn from="left" delay={2}>
            <AuraDot size={80} pulse />
          </SlideIn>
        </div>
        <div>
          <SlideIn from="left" delay={4} distance={30}>
            <Chip>THE SOLUTION · الحل</Chip>
          </SlideIn>
          <SlideIn from="bottom" delay={8} distance={20}>
            <h1
              style={{
                fontFamily: FONTS.displayEN,
                fontWeight: 700,
                fontSize: 76,
                color: COLORS.white,
                margin: "20px 0 0 0",
                lineHeight: 1.05,
                maxWidth: 1300,
              }}
            >
              <TypeReveal text="Webora — productized web design." startFrame={12} perChar={1.1} />
            </h1>
          </SlideIn>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 420,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 36,
        }}
      >
        {pillars.map((p, i) => (
          <SlideIn key={p.tag} from="bottom" delay={20 + i * 8} distance={80}>
            <Card style={{ minHeight: 300, textAlign: "center" }} glow={i === 0}>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 18,
                  letterSpacing: "0.25em",
                  color: COLORS.mint,
                  marginBottom: 18,
                }}
              >
                {p.tag} · {String(i + 1).padStart(2, "0")}
              </div>
              <div
                style={{
                  width: 90,
                  height: 90,
                  margin: "0 auto 20px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.mint})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.white,
                  fontSize: 44,
                  fontWeight: 700,
                }}
              >
                {p.emoji}
              </div>
              <div style={{ fontFamily: FONTS.displayEN, fontSize: 40, color: COLORS.white, fontWeight: 700, marginBottom: 10 }}>
                {p.en}
              </div>
              <div style={{ fontFamily: FONTS.displayAR, fontSize: 24, color: COLORS.cream, direction: "rtl" }}>
                {p.ar}
              </div>
            </Card>
          </SlideIn>
        ))}
      </div>

      <SlideIn from="bottom" delay={80} distance={20}>
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 72,
            right: 72,
            fontFamily: FONTS.displayEN,
            fontSize: 42,
            color: COLORS.mint,
            fontWeight: 500,
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          <TypeReveal text="Fast. Fixed. Bilingual. Guaranteed." startFrame={80} perChar={1.4} />
        </div>
      </SlideIn>

      <FooterMark page="04 / 15" />
    </AbsoluteFill>
  );
};
