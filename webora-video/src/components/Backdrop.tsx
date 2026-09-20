import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/**
 * The Webora backdrop: Deep Ink base + slow violet radial + drifting mint aura point.
 * Present in every scene so the video feels one continuous world, not a slideshow.
 */
export const Backdrop: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 120) * 40;
  const drift2 = Math.cos(frame / 90) * 30;

  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      {/* violet radial — top-right */}
      <div
        style={{
          position: "absolute",
          top: `-20%`,
          right: `${-15 + drift * 0.1}%`,
          width: 1600,
          height: 1600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.violet}${Math.round(intensity * 60).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
          filter: "blur(20px)",
        }}
      />
      {/* mint aura — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: `-30%`,
          left: `${-20 + drift2 * 0.1}%`,
          width: 1400,
          height: 1400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.mint}22 0%, transparent 60%)`,
          filter: "blur(30px)",
        }}
      />
      {/* subtle grid for depth */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.06 }}
      >
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke={COLORS.mint} strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </AbsoluteFill>
  );
};
