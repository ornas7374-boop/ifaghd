import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";

// Scene 9 — Traction (5s / 150 frames) — early proof
export const S09_Traction: React.FC = () => {
  const frame = useCurrentFrame();
  const kpis = [
    { n: "5", label: "Beta clients delivered" },
    { n: "100%", label: "On-time delivery" },
    { n: "9.2", label: "Average NPS" },
    { n: "12", label: "CARE subscribers" },
  ];

  const logos = ["MADAR", "ORCHID", "RUKN", "NOOR & CO", "HAYA"];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="TRACTION" index={9} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>TRACTION · الإنجازات</Chip>
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
            <TypeReveal text="Early proof." startFrame={10} perChar={1.4} />
          </h1>
        </SlideIn>
      </div>

      {/* KPI grid */}
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 28,
        }}
      >
        {kpis.map((k, i) => (
          <SlideIn key={k.label} from="bottom" delay={18 + i * 6} distance={40}>
            <Card style={{ padding: 32, minHeight: 180, textAlign: "center" }} glow={i === 1}>
              <div
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 76,
                  fontWeight: 700,
                  color: i === 1 ? COLORS.mint : COLORS.white,
                  lineHeight: 1,
                }}
              >
                {k.n}
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.muted, letterSpacing: "0.18em", marginTop: 14, textTransform: "uppercase" }}>
                {k.label}
              </div>
            </Card>
          </SlideIn>
        ))}
      </div>

      {/* Marquee-style logo row (placeholders as brand-styled wordmarks) */}
      <div
        style={{
          position: "absolute",
          top: 660,
          left: 72,
          right: 72,
          height: 100,
          overflow: "hidden",
          borderTop: `1px solid ${COLORS.panelBorder}`,
          borderBottom: `1px solid ${COLORS.panelBorder}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 90,
            transform: `translateX(${-((frame * 1.2) % 900)}px)`,
            paddingLeft: 60,
          }}
        >
          {[...logos, ...logos, ...logos].map((l, i) => (
            <div
              key={i}
              style={{
                fontFamily: FONTS.displayEN,
                fontSize: 34,
                letterSpacing: "0.3em",
                color: COLORS.muted,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {l}
            </div>
          ))}
        </div>
      </div>

      <SlideIn from="bottom" delay={60} distance={20}>
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 72,
            right: 72,
            fontFamily: FONTS.displayEN,
            fontSize: 30,
            color: COLORS.cream,
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          "أطلقنا موقعنا في 6 أيام. ما توقعنا هذا المستوى."{" "}
          <span style={{ color: COLORS.muted, fontFamily: FONTS.mono, fontSize: 20, letterSpacing: "0.2em" }}>
            — BETA CLIENT
          </span>
        </div>
      </SlideIn>

      <FooterMark page="09 / 15" />
    </AbsoluteFill>
  );
};
