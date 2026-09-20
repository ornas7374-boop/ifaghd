import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useCountUp, useReveal, fmt } from "../utils";

// Scene 12 — Financials (6s / 180 frames) — Y1 quarterly bars + Y2 target
export const S12_Financials: React.FC = () => {
  const b1 = useReveal(20, 80);
  const b2 = useReveal(28, 88);
  const b3 = useReveal(36, 96);
  const b4 = useReveal(44, 104);
  const total = useCountUp(875, 60, 130);
  const y2 = useCountUp(2.4, 110, 170);

  const bars = [
    { label: "Q1", value: 65, ratio: 65 / 400 },
    { label: "Q2", value: 150, ratio: 150 / 400 },
    { label: "Q3", value: 260, ratio: 260 / 400 },
    { label: "Q4", value: 400, ratio: 400 / 400 },
  ];
  const reveals = [b1, b2, b3, b4];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="FINANCIALS" index={12} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>FINANCIALS · المالية</Chip>
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
            <TypeReveal text="Path to 5M SAR ARR in 24 months." startFrame={10} perChar={1.0} />
          </h1>
        </SlideIn>
      </div>

      {/* Quarterly bar chart */}
      <div
        style={{
          position: "absolute",
          top: 420,
          left: 120,
          width: 800,
          height: 380,
          display: "flex",
          alignItems: "flex-end",
          gap: 60,
          padding: "0 40px",
          borderLeft: `2px solid ${COLORS.panelBorder}`,
          borderBottom: `2px solid ${COLORS.panelBorder}`,
        }}
      >
        {bars.map((b, i) => (
          <div key={b.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, flex: 1 }}>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 18,
                color: COLORS.white,
                opacity: reveals[i],
              }}
            >
              {fmt(b.value * reveals[i])}K
            </div>
            <div
              style={{
                width: "100%",
                height: 320 * b.ratio * reveals[i],
                background: `linear-gradient(180deg, ${COLORS.mint}, ${COLORS.violet})`,
                borderRadius: "12px 12px 0 0",
                boxShadow: `0 -4px 30px ${COLORS.mint}55`,
              }}
            />
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 22,
                color: COLORS.muted,
                letterSpacing: "0.2em",
                marginTop: 8,
              }}
            >
              {b.label}
            </div>
          </div>
        ))}
      </div>

      {/* Y1 total & Y2 target */}
      <div style={{ position: "absolute", top: 430, right: 100, display: "flex", flexDirection: "column", gap: 30, width: 700 }}>
        <SlideIn from="right" delay={30} distance={40}>
          <div
            style={{
              padding: "30px 40px",
              background: COLORS.panel,
              border: `1.5px solid ${COLORS.panelBorder}`,
              borderRadius: 20,
            }}
          >
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.25em", color: COLORS.muted, marginBottom: 12 }}>
              YEAR 1 TOTAL
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 84, fontWeight: 700, color: COLORS.white, lineHeight: 1 }}>
              {fmt(total)}K <span style={{ fontSize: 30, color: COLORS.muted }}>SAR</span>
            </div>
            <div style={{ fontFamily: FONTS.displayAR, fontSize: 22, color: COLORS.cream, marginTop: 10, direction: "rtl" }}>
              67 مشروع + اشتراكات CARE
            </div>
          </div>
        </SlideIn>
        <SlideIn from="right" delay={100} distance={40}>
          <div
            style={{
              padding: "30px 40px",
              background: `linear-gradient(135deg, ${COLORS.violet}44, ${COLORS.mint}22)`,
              border: `1.5px solid ${COLORS.mint}`,
              borderRadius: 20,
              boxShadow: `0 0 60px ${COLORS.mint}44`,
            }}
          >
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.25em", color: COLORS.mint, marginBottom: 12 }}>
              YEAR 2 TARGET
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 84, fontWeight: 700, color: COLORS.mint, lineHeight: 1 }}>
              {y2.toFixed(1)}M <span style={{ fontSize: 30, color: COLORS.muted }}>SAR</span>
            </div>
            <div style={{ fontFamily: FONTS.displayAR, fontSize: 22, color: COLORS.cream, marginTop: 10, direction: "rtl" }}>
              200 مشروع + 60 اشتراك CARE
            </div>
          </div>
        </SlideIn>
      </div>

      <FooterMark page="12 / 15" />
    </AbsoluteFill>
  );
};
