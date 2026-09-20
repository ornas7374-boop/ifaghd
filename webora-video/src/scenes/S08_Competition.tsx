import { AbsoluteFill } from "remotion";
import { COLORS, FONTS } from "../theme";
import { Backdrop } from "../components/Backdrop";
import { Chip } from "../components/Card";
import { SceneTag, FooterMark } from "../components/Chrome";
import { SlideIn, TypeReveal } from "../components/Reveal";
import { useReveal, useFloat } from "../utils";

// Scene 8 — Competition (6s / 180 frames) — the empty-lane 2×2
export const S08_Competition: React.FC = () => {
  const axisX = useReveal(20, 45);
  const axisY = useReveal(20, 45);
  const float = useFloat(4, 100);

  const gridLeft = 480;
  const gridTop = 320;
  const gridW = 960;
  const gridH = 560;

  const players = [
    { name: "Agencies", zone: "top-left", ar: "بطيء + Premium" },
    { name: "WEBORA", zone: "top-right", ar: "سريع + Premium", hero: true },
    { name: "Freelancers", zone: "bottom-left", ar: "بطيء + Budget" },
    { name: "Wix / DIY", zone: "bottom-right", ar: "سريع + Budget" },
  ];

  const zone = (z: string) => {
    const cw = gridW / 2;
    const ch = gridH / 2;
    const map: Record<string, { x: number; y: number }> = {
      "top-left": { x: gridLeft, y: gridTop },
      "top-right": { x: gridLeft + cw, y: gridTop },
      "bottom-left": { x: gridLeft, y: gridTop + ch },
      "bottom-right": { x: gridLeft + cw, y: gridTop + ch },
    };
    return { ...map[z], w: cw, h: ch };
  };

  return (
    <AbsoluteFill>
      <Backdrop />
      <SceneTag label="COMPETITION" index={8} />

      <div style={{ position: "absolute", top: 140, left: 72, right: 72 }}>
        <SlideIn from="left" delay={2}>
          <Chip>COMPETITION · المنافسة</Chip>
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
            <TypeReveal text="We own an empty lane." startFrame={10} perChar={1.2} />
          </h1>
        </SlideIn>
      </div>

      {/* Axis labels */}
      <div
        style={{
          position: "absolute",
          left: gridLeft,
          top: gridTop - 50,
          width: gridW,
          textAlign: "center",
          fontFamily: FONTS.mono,
          fontSize: 20,
          letterSpacing: "0.25em",
          color: COLORS.muted,
        }}
      >
        SLOW ←—————→ FAST
      </div>
      <div
        style={{
          position: "absolute",
          left: gridLeft - 80,
          top: gridTop + gridH / 2 - 100,
          transform: "rotate(-90deg)",
          fontFamily: FONTS.mono,
          fontSize: 20,
          letterSpacing: "0.25em",
          color: COLORS.muted,
        }}
      >
        BUDGET ←—→ PREMIUM
      </div>

      {/* Grid lines */}
      <svg
        style={{ position: "absolute", left: gridLeft, top: gridTop, width: gridW, height: gridH }}
        viewBox={`0 0 ${gridW} ${gridH}`}
      >
        <rect
          x={0}
          y={0}
          width={gridW * axisX}
          height={gridH}
          fill="none"
          stroke={COLORS.muted}
          strokeWidth={1.5}
          strokeDasharray="6 6"
          opacity={0.5}
        />
        <line x1={gridW / 2} y1={0} x2={gridW / 2} y2={gridH * axisY} stroke={COLORS.muted} strokeWidth={1.5} strokeDasharray="6 6" opacity={0.5} />
        <line x1={0} y1={gridH / 2} x2={gridW * axisX} y2={gridH / 2} stroke={COLORS.muted} strokeWidth={1.5} strokeDasharray="6 6" opacity={0.5} />
      </svg>

      {players.map((p, i) => {
        const z = zone(p.zone);
        return (
          <SlideIn key={p.name} delay={50 + i * 8}>
            <div
              style={{
                position: "absolute",
                left: z.x + z.w / 2 - 130,
                top: z.y + z.h / 2 - 60 + (p.hero ? float : 0),
                width: 260,
                height: 120,
                borderRadius: 20,
                background: p.hero
                  ? `linear-gradient(135deg, ${COLORS.violet}, ${COLORS.mint})`
                  : COLORS.panel,
                border: p.hero ? "none" : `1.5px solid ${COLORS.panelBorder}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: p.hero ? `0 0 60px ${COLORS.mint}88` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.displayEN,
                  fontSize: 30,
                  fontWeight: 700,
                  color: COLORS.white,
                  letterSpacing: p.hero ? "0.05em" : 0,
                }}
              >
                {p.hero ? "◈ " : ""}
                {p.name}
              </div>
              <div style={{ fontFamily: FONTS.displayAR, fontSize: 18, color: p.hero ? COLORS.cream : COLORS.muted, direction: "rtl", marginTop: 4 }}>
                {p.ar}
              </div>
            </div>
          </SlideIn>
        );
      })}

      <SlideIn from="bottom" delay={100} distance={24}>
        <div
          style={{
            position: "absolute",
            bottom: 100,
            left: 72,
            right: 72,
            textAlign: "center",
            fontFamily: FONTS.displayEN,
            fontSize: 32,
            color: COLORS.mint,
          }}
        >
          Nobody in MENA owns{" "}
          <span style={{ color: COLORS.white, fontWeight: 700 }}>
            Fast + Premium + Bilingual + Fixed-price
          </span>
          .
        </div>
      </SlideIn>

      <FooterMark page="08 / 15" />
    </AbsoluteFill>
  );
};
