import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useCountUp, useFloat, fmt } from "../utils";

// Scene 6 — Product Tiers (7s / 210 frames)
export const S06_Tiers: React.FC = () => {
  const l = useCountUp(5999, 24, 90);
  const g = useCountUp(12999, 30, 96);
  const s = useCountUp(24999, 36, 102);
  const care = useCountUp(999, 130, 180);
  const float = useFloat(6, 100);

  const tiers = [
    { name: "LAUNCH", price: l, days: "7 أيام", pages: "5 صفحات", en: "Ship fast", glow: false, index: 0 },
    { name: "GROW", price: g, days: "14 يوم", pages: "حتى 15 صفحة", en: "Look like the leader", glow: true, index: 1 },
    { name: "SCALE", price: s, days: "21 يوم", pages: "متجر / حجوزات", en: "Systems that sell", glow: false, index: 2 },
  ];

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="TIERS" index={6} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>PACKAGES · الباقات</Chip>
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
            <TypeReveal text="Three tiers. Zero surprises." startFrame={10} perChar={1.1} />
          </h1>
        </SlideIn>
      </div>

      <div
        style={{
          position: "absolute",
          top: 400,
          left: 72,
          right: 72,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 36,
        }}
      >
        {tiers.map((t) => (
          <SlideIn key={t.name} from="bottom" delay={16 + t.index * 8} distance={80}>
            <div style={{ transform: t.glow ? `translateY(${float}px)` : undefined }}>
              <Card glow={t.glow} style={{ minHeight: 460 }}>
                {t.glow && (
                  <div
                    style={{
                      position: "absolute",
                      top: -14,
                      left: 40,
                      fontFamily: FONTS.mono,
                      fontSize: 16,
                      color: COLORS.ink,
                      background: COLORS.mint,
                      padding: "6px 14px",
                      borderRadius: 999,
                      letterSpacing: "0.2em",
                      fontWeight: 700,
                    }}
                  >
                    الأكثر مبيعاً
                  </div>
                )}
                <div style={{ fontFamily: FONTS.mono, fontSize: 24, letterSpacing: "0.3em", color: t.glow ? COLORS.mint : COLORS.muted, marginBottom: 16 }}>
                  {t.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 22, color: COLORS.muted }}>SAR</span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 84, fontWeight: 700, color: COLORS.white, lineHeight: 1 }}>
                    {fmt(t.price)}
                  </span>
                </div>
                <div style={{ fontFamily: FONTS.displayAR, fontSize: 22, color: COLORS.mint, marginBottom: 32, direction: "rtl" }}>
                  {t.en} · {t.days}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, direction: "rtl" }}>
                  {[t.pages, "ثنائي اللغة", "Responsive", "SEO + Analytics"].map((f, fi) => (
                    <li
                      key={fi}
                      style={{
                        fontFamily: FONTS.displayAR,
                        fontSize: 24,
                        color: COLORS.cream,
                        padding: "12px 0",
                        borderTop: fi === 0 ? "none" : `1px solid ${COLORS.panelBorder}`,
                        textAlign: "right",
                        display: "flex",
                        justifyContent: "space-between",
                        flexDirection: "row-reverse",
                      }}
                    >
                      <span>{f}</span>
                      <span style={{ color: COLORS.mint }}>◈</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </SlideIn>
        ))}
      </div>

      <SlideIn from="bottom" delay={120} distance={30}>
        <div
          style={{
            position: "absolute",
            bottom: 90,
            left: 72,
            right: 72,
            padding: "24px 32px",
            background: `linear-gradient(90deg, ${COLORS.violet}22, ${COLORS.mint}22)`,
            border: `1.5px solid ${COLORS.mint}55`,
            borderRadius: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, letterSpacing: "0.25em", color: COLORS.mint, marginBottom: 6 }}>
              SUBSCRIPTION · CARE
            </div>
            <div style={{ fontFamily: FONTS.displayAR, fontSize: 28, color: COLORS.white, direction: "rtl" }}>
              هوستنج + صيانة + 5 تعديلات + دعم أولوية
            </div>
          </div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 56, fontWeight: 700, color: COLORS.mint, whiteSpace: "nowrap" }}>
            SAR {fmt(care)} <span style={{ fontSize: 20, color: COLORS.muted }}>/ شهر</span>
          </div>
        </div>
      </SlideIn>

      <FooterMark page="06 / 15" />
    </AbsoluteFill>
  );
};
