import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useReveal } from "../utils";

// Scene 5 — How It Works (6s / 180 frames)
export const S05_HowItWorks: React.FC = () => {
  const steps = [
    { day: "Day 0", en: "Brief", ar: "نموذج ذكي · 15 دقيقة" },
    { day: "Day 1–3", en: "Design", ar: "أول نسخة تصميم" },
    { day: "Day 4–6", en: "Build", ar: "تطوير مع AI acceleration" },
    { day: "Day 7", en: "Launch", ar: "نشر + تدريب" },
  ];

  const lineProgress = useReveal(20, 130);

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="HOW IT WORKS" index={5} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>PROCESS · كيف يشتغل</Chip>
        </SlideIn>
        <SlideIn from="bottom" delay={6} distance={24}>
          <h1
            style={{
              fontFamily: FONTS.displayEN,
              fontWeight: 700,
              fontSize: 80,
              color: COLORS.white,
              margin: "24px 0 0 0",
              lineHeight: 1.05,
            }}
          >
            <TypeReveal text="From brief to launch in 4 steps." startFrame={10} perChar={1.1} />
          </h1>
        </SlideIn>
      </div>

      {/* Progress rail behind the cards */}
      <div
        style={{
          position: "absolute",
          top: 560,
          left: 132,
          right: 132,
          height: 4,
          background: `${COLORS.mint}22`,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${lineProgress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.mint})`,
            boxShadow: `0 0 20px ${COLORS.mint}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 440,
          left: 132,
          right: 132,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 32,
          alignItems: "start",
        }}
      >
        {steps.map((s, i) => (
          <SlideIn key={s.en} from="bottom" delay={20 + i * 10} distance={60}>
            <Card style={{ padding: 32, textAlign: "center" }} glow={i === 3}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  margin: "0 auto 20px",
                  borderRadius: 20,
                  background: i === 3 ? COLORS.mint : COLORS.violet,
                  color: i === 3 ? COLORS.ink : COLORS.white,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: FONTS.mono,
                  fontWeight: 700,
                  fontSize: 30,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 20, color: COLORS.muted, letterSpacing: "0.15em", marginBottom: 8 }}>
                {s.day.toUpperCase()}
              </div>
              <div style={{ fontFamily: FONTS.displayEN, fontSize: 40, color: COLORS.white, fontWeight: 700, marginBottom: 10 }}>
                {s.en}
              </div>
              <div style={{ fontFamily: FONTS.displayAR, fontSize: 22, color: COLORS.cream, direction: "rtl" }}>
                {s.ar}
              </div>
            </Card>
          </SlideIn>
        ))}
      </div>

      <SlideIn from="bottom" delay={100} distance={20}>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 72,
            right: 72,
            textAlign: "center",
            fontFamily: FONTS.displayEN,
            fontSize: 32,
            color: COLORS.mint,
          }}
        >
          <span style={{ color: COLORS.muted, fontFamily: FONTS.mono, letterSpacing: "0.2em", fontSize: 20 }}>SECRET SAUCE · </span>
          AI production × senior human curation ={" "}
          <span style={{ fontWeight: 700, color: COLORS.white }}>agency quality at 10× speed.</span>
        </div>
      </SlideIn>

      <FooterMark page="05 / 15" />
    </AbsoluteFill>
  );
};
