"use client";

import { formatNumber } from "@/lib/format";

interface Payload {
  name: string;
  value: number;
  color: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Payload[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface px-3 py-2 shadow-lg shadow-black/10">
      <p className="mb-1 text-xs font-semibold text-ink-secondary">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-ink-secondary">{p.name}</span>
            <span className="ms-auto font-bold tabular-nums text-ink">
              {formatNumber(p.value)} {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
