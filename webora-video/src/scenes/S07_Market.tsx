import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useCountUp, useSpringIn, fmt } from "../utils";

// Scene 7 — Target Market (6s / 180 frames)
export const S07_Market: React.FC = () => {
  const frame = useCurrentFrame();
  const tam = useCountUp(1200, 40, 100);
  const smb = useCountUp(180, 60, 120);

  const industries = ["Restaurants", "Clinics", "Consultancies", "Real Estate", "Fitness", "Ed-tech"];
  const centerX = 960;
  const centerY = 640;
  const radius = 280;

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="MARKET" index={7} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>ICP · الجمهور المستهدف</Chip>
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
            <TypeReveal text="The Serious Founder." startFrame={10} perChar={1.2} />
          </h1>
        </SlideIn>
      </div>

      {/* Central persona badge with pulsing rings */}
      <div style={{ position: "absolute", left: centerX - 130, top: centerY - 130 }}>
        <SlideIn delay={20}>
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${COLORS.violet}, ${COLORS.ink})`,
              border: `3px solid ${COLORS.mint}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: COLORS.white,
              boxShadow: `0 0 80px ${COLORS.mint}66`,
            }}
          >
            <div style={{ fontFamily: FONTS.mono, fontSize: 16, color: COLORS.mint, letterSpacing: "0.2em" }}>ICP</div>
            <div style={{ fontFamily: FONTS.displayEN, fontSize: 36, fontWeight: 700, marginTop: 4 }}>28–45</div>
            <div style={{ fontFamily: FONTS.displayAR, fontSize: 20, color: COLORS.cream, marginTop: 4 }}>خليجي</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 18, marginTop: 6 }}>500K–10M SAR</div>
          </div>
        </SlideIn>
      </div>

      {/* Pulsing outer rings */}
      {[0, 1, 2].map((i) => {
        const t = ((frame + i * 30) % 90) / 90;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: centerX - 130 - t * 150,
              top: centerY - 130 - t * 150,
              width: 260 + t * 300,
              height: 260 + t * 300,
              border: `2px solid ${COLORS.mint}`,
              borderRadius: "50%",
              opacity: (1 - t) * 0.4,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Industry chips orbit */}
      {industries.map((ind, i) => {
        const angle = (Math.PI * 2 * i) / industries.length - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        return <IndustryChip key={ind} x={x} y={y} label={ind} delay={30 + i * 4} />;
      })}

      {/* TAM stats bottom */}
      <SlideIn from="bottom" delay={80} distance={30}>
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 72,
            right: 72,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 40,
            padding: "24px 0",
            borderTop: `1px solid ${COLORS.panelBorder}`,
            borderBottom: `1px solid ${COLORS.panelBorder}`,
          }}
        >
          <StatMini n={`${fmt(tam)}K`} label="SMBs in KSA need web presence" />
          <StatMini n="15%" label="have modern bilingual sites" mint />
          <StatMini n={`${fmt(smb)}K`} label="Serviceable Market" />
        </div>
      </SlideIn>

      <FooterMark page="07 / 15" />
    </AbsoluteFill>
  );
};

const IndustryChip: React.FC<{ x: number; y: number; label: string; delay: number }> = ({ x, y, label, delay }) => {
  const s = useSpringIn(delay);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 100,
        top: y - 30,
        width: 200,
        height: 60,
        borderRadius: 999,
        background: COLORS.panel,
        border: `1.5px solid ${COLORS.mint}66`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.displayEN,
        fontSize: 20,
        color: COLORS.white,
        opacity: s,
        transform: `scale(${s})`,
        transformOrigin: "center center",
      }}
    >
      {label}
    </div>
  );
};

const StatMini: React.FC<{ n: string; label: string; mint?: boolean }> = ({ n, label, mint }) => (
  <div style={{ textAlign: "center" }}>
    <div style={{ fontFamily: FONTS.mono, fontSize: 60, fontWeight: 700, color: mint ? COLORS.mint : COLORS.white }}>{n}</div>
    <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: COLORS.muted, letterSpacing: "0.15em", textTransform: "uppercase" }}>
      {label}
    </div>
  </div>
);
