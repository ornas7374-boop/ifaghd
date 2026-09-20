import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useSpringIn, useFloat } from "../utils";

// Scene 13 — Team (5s / 150 frames) — AI-native founder + orbiting network
export const S13_Team: React.FC = () => {
  const frame = useCurrentFrame();
  const founderScale = useSpringIn(6);
  const float = useFloat(6, 100);

  const roles = [
    "Senior Designer",
    "Senior Designer",
    "Webflow Dev",
    "Framer Dev",
    "Copywriter (AR/EN)",
    "Project Manager",
  ];

  const cx = 960;
  const cy = 620;
  const radius = 260;

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="TEAM" index={13} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>TEAM · الفريق</Chip>
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
            <TypeReveal text="Built by an AI-native founder." startFrame={10} perChar={1.1} />
          </h1>
        </SlideIn>
      </div>

      {/* Founder core badge */}
      <div
        style={{
          position: "absolute",
          left: cx - 130,
          top: cy - 130 + float,
          transform: `scale(${founderScale})`,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.violet}, ${COLORS.ink})`,
            border: `3px solid ${COLORS.mint}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 80px ${COLORS.mint}88`,
          }}
        >
          <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: COLORS.mint, letterSpacing: "0.25em" }}>FOUNDER</div>
          <div style={{ fontFamily: FONTS.displayEN, fontSize: 34, fontWeight: 700, color: COLORS.white, marginTop: 6, textAlign: "center", padding: "0 20px", lineHeight: 1.1 }}>
            AI-first
          </div>
          <div style={{ fontFamily: FONTS.displayAR, fontSize: 22, color: COLORS.cream, marginTop: 4 }}>
            ذكاء اصطناعي + خبرة عربية
          </div>
        </div>
      </div>

      {/* Orbiting freelance network */}
      {roles.map((role, i) => {
        const baseAngle = (Math.PI * 2 * i) / roles.length - Math.PI / 2;
        const angle = baseAngle + frame / 200;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.55;
        return <OrbitRole key={i} x={x} y={y} label={role} delay={30 + i * 4} />;
      })}

      {/* Orbit path */}
      <svg style={{ position: "absolute", left: cx - radius - 40, top: cy - radius * 0.55 - 20, width: (radius + 40) * 2, height: radius * 1.1 + 40, pointerEvents: "none" }}>
        <ellipse
          cx={radius + 40}
          cy={radius * 0.55 + 20}
          rx={radius}
          ry={radius * 0.55}
          fill="none"
          stroke={COLORS.mint}
          strokeOpacity={0.15}
          strokeWidth={2}
          strokeDasharray="6 8"
        />
      </svg>

      <FooterMark page="13 / 15" />
    </AbsoluteFill>
  );
};

const OrbitRole: React.FC<{ x: number; y: number; label: string; delay: number }> = ({ x, y, label, delay }) => {
  const s = useSpringIn(delay);
  return (
    <div
      style={{
        position: "absolute",
        left: x - 110,
        top: y - 26,
        width: 220,
        height: 52,
        borderRadius: 999,
        background: COLORS.panel,
        border: `1.5px solid ${COLORS.panelBorder}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.body,
        fontSize: 18,
        color: COLORS.cream,
        opacity: s,
        transform: `scale(${s})`,
        boxShadow: `0 6px 20px rgba(0,0,0,0.4)`,
      }}
    >
      {label}
    </div>
  );
};
