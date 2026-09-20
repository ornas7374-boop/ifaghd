import React from "react";
import { useCurrentFrame } from "remotion";
import { useReveal, useSpringIn } from "../utils";

/**
 * Slides + fades content in from a direction. Use for cards, chips, headlines.
 */
export const SlideIn: React.FC<{
  from?: "left" | "right" | "top" | "bottom";
  delay?: number;
  distance?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ from = "bottom", delay = 0, distance = 40, children, style }) => {
  const s = useSpringIn(delay);
  const invert = from === "right" || from === "bottom" ? 1 : -1;
  const axis = from === "left" || from === "right" ? "translateX" : "translateY";
  const offset = (1 - s) * distance * invert;
  return (
    <div
      style={{
        opacity: s,
        transform: `${axis}(${offset}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Character-by-character reveal for headlines. `perChar` frames between letters.
 */
export const TypeReveal: React.FC<{
  text: string;
  startFrame?: number;
  perChar?: number;
  style?: React.CSSProperties;
  direction?: "ltr" | "rtl";
}> = ({ text, startFrame = 0, perChar = 1.2, style, direction = "ltr" }) => {
  const frame = useCurrentFrame();
  const chars = Array.from(text);
  return (
    <span style={{ direction, display: "inline-block", ...style }}>
      {chars.map((ch, i) => {
        const t = Math.max(0, Math.min(1, (frame - startFrame - i * perChar) / 6));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: t,
              transform: `translateY(${(1 - t) * 12}px)`,
              whiteSpace: "pre",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};

/**
 * Line reveal: draws an SVG line from 0 → length.
 */
export const LineReveal: React.FC<{
  start: number;
  end: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width?: number;
}> = ({ start, end, x1, y1, x2, y2, color, width = 3 }) => {
  const p = useReveal(start, end);
  const cx = x1 + (x2 - x1) * p;
  const cy = y1 + (y2 - y1) * p;
  return <line x1={x1} y1={y1} x2={cx} y2={cy} stroke={color} strokeWidth={width} strokeLinecap="round" />;
};

/**
 * Vertical bar that grows from 0 to target height.
 */
export const GrowBar: React.FC<{
  start: number;
  end: number;
  height: number;
  width: number;
  color: string;
  radius?: number;
  style?: React.CSSProperties;
}> = ({ start, end, height, width, color, radius = 12, style }) => {
  const p = useReveal(start, end);
  return (
    <div
      style={{
        width,
        height: height * p,
        background: `linear-gradient(180deg, ${color}, ${color}88)`,
        borderRadius: radius,
        boxShadow: `0 -4px 30px ${color}66`,
        ...style,
      }}
    />
  );
};
