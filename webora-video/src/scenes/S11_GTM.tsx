import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useReveal } from "../utils";

// Scene 11 — Go-to-Market (7s / 210 frames)
export const S11_GTM: React.FC = () => {
  const rail = useReveal(20, 130);

  const phases = [
    {
      title: "Portfolio",
      months: "Month 1–3",
      bullets: ["5 beta case studies", "Founder content", "100 DMs/week"],
    },
    {
      title: "Paid Acquisition",
      months: "Month 4–6",
      bullets: ["IG/TikTok reels", "Google Ads bottom-funnel", "15% referral"],
    },
    {
      title: "Scale",
      months: "Month 7–12",
      bullets: ["SEO authority", "Agency re-sellers", "Enterprise tier"],
    },
  ];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="GTM" index={11} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>GO-TO-MARKET · خطة الإطلاق</Chip>
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
            <TypeReveal text="Three channels. One growth engine." startFrame={10} perChar={1.0} />
          </h1>
        </SlideIn>
      </div>

      {/* Horizontal timeline rail */}
      <div
        style={{
          position: "absolute",
          top: 470,
          left: 200,
          right: 200,
          height: 6,
          background: `${COLORS.mint}22`,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${rail * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${COLORS.violet}, ${COLORS.mint})`,
            boxShadow: `0 0 24px ${COLORS.mint}`,
          }}
        />
      </div>

      {/* Nodes on the rail */}
      {[0, 1, 2].map((i) => {
        const left = 200 + ((1920 - 400) / 4) * (i + 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 462,
              left,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: COLORS.mint,
              boxShadow: `0 0 24px ${COLORS.mint}`,
              opacity: rail > (i + 1) / 4 ? 1 : 0,
              transform: "translateX(-50%)",
            }}
          />
        );
      })}

      {/* Phase cards */}
      <div
        style={{
          position: "absolute",
          top: 540,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 40,
        }}
      >
        {phases.map((ph, i) => (
          <SlideIn key={ph.title} from="bottom" delay={30 + i * 10} distance={60}>
            <Card style={{ minHeight: 320 }} glow={i === 2}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.25em", color: COLORS.mint, marginBottom: 10 }}>
                PHASE {i + 1} · {ph.months.toUpperCase()}
              </div>
              <div style={{ fontFamily: FONTS.displayEN, fontSize: 44, color: COLORS.white, fontWeight: 700, marginBottom: 24 }}>
                {ph.title}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {ph.bullets.map((b, bi) => (
                  <li
                    key={bi}
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: 22,
                      color: COLORS.cream,
                      padding: "10px 0",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ color: COLORS.mint }}>→</span>
                    {b}
                  </li>
                ))}
              </ul>
            </Card>
          </SlideIn>
        ))}
      </div>

      {/* CAC / LTV badges */}
      <SlideIn from="bottom" delay={130} distance={20}>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 72,
            right: 72,
            display: "flex",
            justifyContent: "center",
            gap: 60,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 24, color: COLORS.muted, letterSpacing: "0.2em" }}>
            CAC TARGET <span style={{ color: COLORS.white, fontWeight: 700 }}>&lt; 2,500 SAR</span>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 24, color: COLORS.muted, letterSpacing: "0.2em" }}>
            LTV / CAC <span style={{ color: COLORS.mint, fontWeight: 700 }}>14×</span>
          </div>
        </div>
      </SlideIn>

      <FooterMark page="11 / 15" />
    </AbsoluteFill>
  );
};
