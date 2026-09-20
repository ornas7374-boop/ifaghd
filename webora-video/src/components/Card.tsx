import React from "react";
import { COLORS } from "../theme";

/**
 * Panel with the Brand Book look: Deep Ink base + hairline mint border on hover.
 * `glow` = highlight (the GROW tier, the WEBORA quadrant).
 */
export const Card: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
  danger?: boolean;
}> = ({ children, style, glow, danger }) => {
  const border = danger
    ? `${COLORS.danger}55`
    : glow
    ? `${COLORS.mint}`
    : COLORS.panelBorder;
  return (
    <div
      style={{
        background: COLORS.panel,
        border: `1.5px solid ${border}`,
        borderRadius: 24,
        padding: 40,
        position: "relative",
        boxShadow: glow
          ? `0 0 60px ${COLORS.mint}55, inset 0 0 0 1px ${COLORS.mint}30`
          : `0 20px 60px rgba(0,0,0,0.3)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Small pill in Brand Book style. Optional color. */
export const Chip: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  style?: React.CSSProperties;
}> = ({ children, color = COLORS.mint, bg, style }) => (
  <span
    style={{
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 20,
      letterSpacing: "0.15em",
      color,
      background: bg ?? `${color}15`,
      border: `1px solid ${color}55`,
      padding: "8px 18px",
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      ...style,
    }}
  >
    {children}
  </span>
);
