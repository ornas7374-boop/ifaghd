import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useCountUp, useFloat, fmt } from "../utils";

// Scene 14 — The Ask (5s / 150 frames)
export const S14_Ask: React.FC = () => {
  const seed = useCountUp(500, 20, 80);
  const clients = useCountUp(30, 30, 90);
  const float = useFloat(6, 90);

  return (
    <AbsoluteFill>
      <Backdrop intensity={1.3} />
      <SceneTag label="THE ASK" index={14} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>THE ASK · الطلب</Chip>
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
            <TypeReveal text="What we need." startFrame={10} perChar={1.4} />
          </h1>
        </SlideIn>
      </div>

      {/* Big amount hero */}
      <SlideIn delay={16} distance={40}>
        <div
          style={{
            position: "absolute",
            top: 380,
            left: 72,
            right: 72,
            textAlign: "center",
            transform: `translateY(${float}px)`,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 24, color: COLORS.mint, letterSpacing: "0.3em", marginBottom: 16 }}>
            SEED ROUND
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 20 }}>
            <div
              style={{
                fontFamily: FONTS.mono,
                fontSize: 260,
                fontWeight: 700,
                color: COLORS.white,
                lineHeight: 1,
                background: `linear-gradient(180deg, ${COLORS.white}, ${COLORS.mint})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {fmt(seed)}K
            </div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 60, color: COLORS.muted, letterSpacing: "0.15em" }}>SAR</div>
          </div>
          <div style={{ fontFamily: FONTS.displayAR, fontSize: 32, color: COLORS.cream, marginTop: 20, direction: "rtl" }}>
            للوصول إلى <span style={{ color: COLORS.mint, fontWeight: 700 }}>{Math.round(clients)}</span> عميل / شهر خلال 12 شهراً
          </div>
        </div>
      </SlideIn>

      {/* Three tracks */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
        }}
      >
        {[
          { tag: "INVESTORS", ar: "للمستثمرين", body: "500K SAR seed · 30 clients / mo" },
          { tag: "PARTNERS", ar: "للشركاء", body: "3 strategic partners · agencies + PR" },
          { tag: "CLIENTS", ar: "للعملاء", body: "Beta cohort — 3 spots at LAUNCH" },
        ].map((o, i) => (
          <SlideIn key={o.tag} from="bottom" delay={90 + i * 8} distance={30}>
            <Card style={{ padding: 24 }}>
              <div style={{ fontFamily: FONTS.mono, fontSize: 16, letterSpacing: "0.3em", color: COLORS.mint, marginBottom: 6 }}>
                {o.tag}
              </div>
              <div style={{ fontFamily: FONTS.displayAR, fontSize: 24, color: COLORS.white, marginBottom: 8, direction: "rtl" }}>
                {o.ar}
              </div>
              <div style={{ fontFamily: FONTS.body, fontSize: 18, color: COLORS.cream }}>{o.body}</div>
            </Card>
          </SlideIn>
        ))}
      </div>

      <FooterMark page="14 / 15" />
    </AbsoluteFill>
  );
};
