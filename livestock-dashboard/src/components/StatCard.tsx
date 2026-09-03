import { formatNumber } from "@/lib/format";
import { accentColorVar, type AccentKey } from "@/lib/colors";

export function StatCard({
  label,
  value,
  accent,
  unit,
}: {
  label: string;
  value: number;
  accent: AccentKey;
  unit?: string;
}) {
  const color = accentColorVar(accent);
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <p className="text-3xl font-extrabold tabular-nums text-ink sm:text-4xl">
        {formatNumber(value)}
        {unit && <span className="ms-1 text-base font-medium text-ink-muted">{unit}</span>}
      </p>
      <p className="mt-2 flex items-center gap-2 text-sm text-ink-secondary">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
    </div>
  );
}
