import type { LucideIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { accentColorVar, type AccentKey } from "@/lib/colors";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  unit,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: AccentKey;
  unit?: string;
}) {
  const color = accentColorVar(accent);
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-5 shadow-sm shadow-black/[0.02]">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
          color,
        }}
      >
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-secondary">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-ink">
          {formatNumber(value)}
          {unit && <span className="ms-1 text-sm font-medium text-ink-muted">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
