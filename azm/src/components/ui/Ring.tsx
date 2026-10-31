import type { ReactNode } from "react";

// حلقة تقدّم دائرية للمؤقتات. progress من 0 إلى 1.
export function Ring({ progress, color = "var(--accent)", children }: { progress: number; color?: string; children: ReactNode }) {
  const r = 140;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto grid size-72 place-items-center">
      <svg viewBox="0 0 300 300" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="150" cy="150" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="150"
          cy="150"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * Math.min(1, Math.max(0, progress))}
          style={{ transition: "stroke-dashoffset 250ms linear" }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}
