import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export function DeltaBadge({
  percent,
  goodWhenUp = true,
}: {
  percent: number | null;
  goodWhenUp?: boolean;
}) {
  if (percent === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-muted">
        <Minus size={12} /> لا يمكن الحساب
      </span>
    );
  }

  const isUp = percent > 0.001;
  const isDown = percent < -0.001;
  const isGood = isUp ? goodWhenUp : isDown ? !goodWhenUp : true;

  const colorClass = isUp || isDown ? (isGood ? "text-good bg-good/10" : "text-critical bg-critical/10") : "text-ink-muted bg-surface-2";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${colorClass}`}>
      <Icon size={12} />
      {percent > 0 ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
}
