import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";

// Scene 2 — The Problem (6s / 180 frames)
// "MENA business owners are stuck with 3 bad choices."
export const S02_Problem: React.FC = () => {
  const columns = [
    {
      title: "Traditional Agencies",
      rows: ["30K–80K SAR", "3–6 أشهر انتظار", "Discovery Phase™"],
    },
    {
      title: "DIY Builders",
      rows: ["تصاميم جنيريك", "دعم عربي ضعيف", "يكسر التصميم RTL"],
    },
    {
      title: "Freelancers",
      rows: ["جودة غير ثابتة", "يختفون فجأة", "لا ضمانات"],
    },
  ];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="PROBLEM" index={2} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2} distance={40}>
          <Chip color={COLORS.danger}>THE PROBLEM · المشكلة</Chip>
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
            <TypeReveal text="MENA owners are stuck with 3 bad choices." startFrame={10} perChar={1.1} />
          </h1>
        </SlideIn>
      </div>

      <div
        style={{
          position: "absolute",
          top: 380,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 36,
        }}
      >
        {columns.map((col, i) => (
          <SlideIn key={col.title} from="bottom" delay={24 + i * 10} distance={80}>
            <Card danger style={{ minHeight: 380 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: `${COLORS.danger}22`,
                    border: `1.5px solid ${COLORS.danger}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: COLORS.danger,
                    fontFamily: FONTS.mono,
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  ✕
                </div>
                <div style={{ fontFamily: FONTS.displayEN, fontSize: 34, color: COLORS.white, fontWeight: 700 }}>
                  {col.title}
                </div>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {col.rows.map((r, ri) => (
                  <li
                    key={r}
                    style={{
                      fontFamily: FONTS.displayAR,
                      fontSize: 28,
                      color: COLORS.cream,
                      padding: "14px 0",
                      borderTop: ri === 0 ? "none" : `1px solid ${COLORS.panelBorder}`,
                      direction: "rtl",
                      textAlign: "right",
                    }}
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          </SlideIn>
        ))}
      </div>

      <SlideIn from="bottom" delay={90} distance={24}>
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 72,
            right: 72,
            fontFamily: FONTS.displayEN,
            fontSize: 34,
            color: COLORS.mint,
            fontStyle: "italic",
            textAlign: "center",
            fontWeight: 500,
          }}
        >
          "You either overpay, undersell your brand, or gamble."
        </div>
      </SlideIn>

      <FooterMark page="02 / 15" />
    </AbsoluteFill>
  );
};
