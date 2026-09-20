import { COLORS, FONTS } from "../theme";
import { AuraDot } from "./AuraDot";

/**
 * Wordmark: "Web" + [Aura o] + "ra".
 * Brand Book spec — the mint dot with mint ring sits in place of the letter "o".
 */
export const Logo: React.FC<{
  size?: number;
  bilingual?: boolean;
  color?: string;
  pulse?: boolean;
}> = ({ size = 120, bilingual = false, color = COLORS.white, pulse = true }) => {
  const dotSize = size * 0.42;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.15 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: size * 0.06,
          fontFamily: FONTS.displayEN,
          fontWeight: 700,
          fontSize: size,
          color,
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span>Web</span>
        <div style={{ margin: `0 -${size * 0.05}px` }}>
          <AuraDot size={dotSize} pulse={pulse} />
        </div>
        <span>ra</span>
      </div>
      {bilingual && (
        <div
          style={{
            fontFamily: FONTS.displayAR,
            fontWeight: 500,
            fontSize: size * 0.42,
            color: COLORS.mint,
            direction: "rtl",
            letterSpacing: "0.02em",
          }}
        >
          ويبورا
        </div>
      )}
    </div>
  );
};
