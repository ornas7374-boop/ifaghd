import { useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

/**
 * The "Aura" — mint dot inside a mint ring.
 * Brand Book calls it "the signature element". Never recolor.
 */
export const AuraDot: React.FC<{
  size?: number;
  color?: string;
  pulse?: boolean;
  delay?: number;
}> = ({ size = 120, color = COLORS.mint, pulse = true, delay = 0 }) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - delay);
  const pulseScale = pulse ? 1 + Math.sin((t / 40) * Math.PI * 2) * 0.06 : 1;
  const ringAlpha = pulse ? 0.35 + Math.sin((t / 40) * Math.PI * 2) * 0.25 : 0.5;
  const ringSize = size * 1.55;
  const outerSize = size * 2.4;

  return (
    <div
      style={{
        position: "relative",
        width: outerSize,
        height: outerSize,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* soft glow */}
      <div
        style={{
          position: "absolute",
          width: outerSize,
          height: outerSize,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}55 0%, transparent 55%)`,
          opacity: ringAlpha,
        }}
      />
      {/* ring */}
      <div
        style={{
          position: "absolute",
          width: ringSize,
          height: ringSize,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          opacity: 0.85,
          transform: `scale(${pulseScale})`,
        }}
      />
      {/* dot */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 ${size / 2}px ${color}`,
        }}
      />
    </div>
  );
};
