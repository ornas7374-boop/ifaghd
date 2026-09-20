import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { Chip } from "../components/Card";
import { useCountUp, useReveal, fmt } from "../utils";

// Scene 3 — The Data (7s / 210 frames)
export const S03_Data: React.FC = () => {
  const p75 = useCountUp(75, 20, 60);
  const p83 = useCountUp(83, 30, 70);
  const p134 = useCountUp(13.4, 40, 80);

  const bar1 = useReveal(20, 80);
  const bar2 = useReveal(26, 86);
  const bar3 = useReveal(32, 92);

  const stats = [
    { value: p75, label: "من مستهلكي السعودية يبحثون أونلاين قبل الشراء", bar: bar1, ratio: 0.75, digits: 0 },
    { value: p83, label: "من الشركات الصغيرة في الخليج بدون موقع احترافي", bar: bar2, ratio: 0.83, digits: 0 },
    { value: p134, label: "نمو سنوي لسوق تصميم المواقع في MENA (CAGR)", bar: bar3, ratio: 0.6, digits: 1 },
  ];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="DATA" index={3} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2} distance={40}>
          <Chip>MARKET DATA · الأرقام</Chip>
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
              maxWidth: 1400,
            }}
          >
            <TypeReveal text="MENA web is exploding — supply is broken." startFrame={12} perChar={1.1} />
          </h1>
        </SlideIn>
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
        {stats.map((s, i) => (
          <SlideIn key={i} from="bottom" delay={20 + i * 6} distance={40}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 128, fontWeight: 700, color: COLORS.mint, lineHeight: 1 }}>
                  {fmt(s.value, s.digits)}
                </div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 64, color: COLORS.mint }}>%</div>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 10,
                  background: `${COLORS.mint}18`,
                  borderRadius: 5,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${s.bar * s.ratio * 100}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.mint})`,
                    borderRadius: 5,
                    boxShadow: `0 0 20px ${COLORS.mint}88`,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: FONTS.displayAR,
                  fontSize: 24,
                  color: COLORS.cream,
                  direction: "rtl",
                  textAlign: "right",
                  lineHeight: 1.5,
                }}
              >
                {s.label}
              </div>
            </div>
          </SlideIn>
        ))}
      </div>

      <SlideIn from="bottom" delay={110} distance={16}>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 72,
            right: 72,
            fontFamily: FONTS.mono,
            fontSize: 20,
            color: COLORS.muted,
            letterSpacing: "0.15em",
            textAlign: "center",
          }}
        >
          SOURCES · GOOGLE MENA CONSUMER INSIGHTS · STATISTA MENA DIGITAL REPORT 2025
        </div>
      </SlideIn>

      <FooterMark page="03 / 15" />
    </AbsoluteFill>
  );
};
