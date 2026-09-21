"use client";
import { AuraDot } from "./AuraDot";

// Wordmark: "Web" + Aura dot + "ra"  (Brand Book — Master · Dark)
export function Logo({ size = 28, bilingual = false, className = "" }: {
  size?: number;
  bilingual?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`} dir="ltr">
      <span
        className="inline-flex items-center font-bold leading-none tracking-[-0.02em] text-white"
        style={{
          fontFamily: "var(--font-space-grotesk), var(--font-display-en)",
          fontSize: size,
          gap: size * 0.06,
        }}
      >
        <span>Web</span>
        <AuraDot size={size * 0.42} />
        <span>ra</span>
      </span>
      {bilingual && (
        <span
          className="text-[color:var(--mint)] tracking-[0.06em]"
          dir="rtl"
          style={{
            fontFamily: "var(--font-ibm-arabic), var(--font-display-ar)",
            fontSize: size * 0.42,
          }}
        >
          ويبورا
        </span>
      )}
    </span>
  );
}
