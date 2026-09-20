import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Card, Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useCountUp, useReveal, fmt } from "../utils";

// Scene 10 — Business Model (6s / 180 frames) — donut + unit economics
export const S10_Model: React.FC = () => {
  const p70 = useReveal(20, 80);
  const p25 = useReveal(30, 90);
  const p5 = useReveal(40, 100);
  const revenue = useCountUp(12999, 60, 130);
  const cost = useCountUp(5800, 70, 140);
  const gp = useCountUp(7199, 80, 150);
  const ltv = useCountUp(35000, 100, 170);

  // Donut config
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const r = 130;
  const stroke = 60;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { label: "One-time", pct: 0.7, color: COLORS.violet, p: p70 },
    { label: "CARE subs", pct: 0.25, color: COLORS.mint, p: p25 },
    { label: "Add-ons", pct: 0.05, color: COLORS.cream, p: p5 },
  ];

  let cumulative = 0;

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="MODEL" index={10} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>BUSINESS MODEL · النموذج المالي</Chip>
        </SlideIn>
        <SlideIn from="bottom" delay={6} distance={24}>
          <h1
            style={{
              fontFamily: FONTS.displayEN,
              fontWeight: 700,
              fontSize: 76,
              color: COLORS.white,
              margin: "24px 0 0 0",
              lineHeight: 1.05,
            }}
          >
            <TypeReveal text="High-margin service + recurring revenue." startFrame={10} perChar={1.0} />
          </h1>
        </SlideIn>
      </div>

      {/* Donut */}
      <div style={{ position: "absolute", top: 400, left: 200 }}>
        <SlideIn delay={16}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.panel} strokeWidth={stroke} />
            {segments.map((seg, i) => {
              const dash = circumference * seg.pct * seg.p;
              const rotation = cumulative * 360 - 90;
              cumulative += seg.pct;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference}`}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  strokeLinecap="butt"
                  style={{ filter: `drop-shadow(0 0 12px ${seg.color}66)` }}
                />
              );
            })}
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              fontFamily={FONTS.mono}
              fontSize={20}
              fill={COLORS.muted}
              style={{ letterSpacing: "0.2em" }}
            >
              REVENUE MIX
            </text>
            <text
              x={cx}
              y={cy + 30}
              textAnchor="middle"
              fontFamily={FONTS.mono}
              fontSize={44}
              fontWeight={700}
              fill={COLORS.white}
            >
              100%
            </text>
          </svg>
        </SlideIn>

        {/* Legend */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {segments.map((seg, i) => (
            <SlideIn key={i} from="left" delay={30 + i * 6} distance={20}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: seg.color }} />
                <div style={{ fontFamily: FONTS.body, fontSize: 20, color: COLORS.cream, minWidth: 160 }}>{seg.label}</div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 22, color: COLORS.white, fontWeight: 700 }}>
                  {(seg.pct * 100).toFixed(0)}%
                </div>
              </div>
            </SlideIn>
          ))}
        </div>
      </div>

      {/* Unit economics cards */}
      <div style={{ position: "absolute", top: 400, right: 72, width: 900, display: "grid", gap: 20 }}>
        {[
          { l: "Revenue / GROW", n: revenue, sub: "SAR per project", color: COLORS.white },
          { l: "Cost", n: cost, sub: "design + dev + tools", color: COLORS.muted },
          { l: "Gross Profit", n: gp, sub: "55% margin", color: COLORS.mint, glow: true },
          { l: "LTV with CARE (24 mo)", n: ltv, sub: "predictable growth", color: COLORS.violet, glow: true },
        ].map((row, i) => (
          <SlideIn key={i} from="right" delay={20 + i * 6} distance={40}>
            <Card style={{ padding: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }} glow={row.glow}>
              <div>
                <div style={{ fontFamily: FONTS.mono, fontSize: 18, color: COLORS.muted, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                  {row.l}
                </div>
                <div style={{ fontFamily: FONTS.displayAR, fontSize: 20, color: COLORS.cream, marginTop: 4 }}>{row.sub}</div>
              </div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 54, fontWeight: 700, color: row.color }}>
                {fmt(row.n)} <span style={{ fontSize: 22, color: COLORS.muted }}>SAR</span>
              </div>
            </Card>
          </SlideIn>
        ))}
      </div>

      <FooterMark page="10 / 15" />
    </AbsoluteFill>
  );
};
