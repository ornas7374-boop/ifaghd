"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Sparkline } from "@/components/charts/sparkline";
import { Skeleton } from "@/components/ui/skeleton";
import type { Kpi, Range } from "@/lib/data/types";
import { cn, formatCurrency, formatDelta, formatNumber, formatValue, pctChange } from "@/lib/format";
import { useCountUp } from "@/lib/hooks/use-count-up";

/** Big values go compact (SAR 451.1K) so 5 cards fit one row; the exact value lives in the title tooltip. */
function display(v: number, format: Kpi["format"]) {
  if (format === "currency" && v >= 100_000) return formatCurrency(v, { compact: true });
  if (format === "number" && v >= 100_000) return formatNumber(v, { compact: true });
  return formatValue(v, format);
}

export function KpiCard({ kpi, range, onSelect, selected, className }: { kpi: Kpi; range: Range; onSelect?: () => void; selected?: boolean; className?: string }) {
  const animated = useCountUp(`kpi-${kpi.id}`, kpi.value);
  const delta = pctChange(kpi.value, kpi.previous);
  const good = delta === null ? null : kpi.invert ? delta < 0 : delta > 0;
  const flat = delta !== null && Math.abs(delta) < 0.001;
  const Arrow = flat || delta === null ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const Comp = onSelect ? "button" : "div";

  return (
    <Comp
      {...(onSelect ? { type: "button" as const, onClick: onSelect, "aria-pressed": selected } : {})}
      className={cn(
        "group flex min-w-0 flex-col gap-2.5 rounded-[10px] border bg-surface p-3 text-left transition-colors duration-150 sm:p-4",
        selected ? "border-accent/50 shadow-[0_0_0_1px_var(--accent-soft)]" : "border-border",
        onSelect && "hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12.5px] font-medium text-muted" title={kpi.hint}>
          {kpi.label}
        </span>
        {delta !== null && (
          <span
            className={cn(
              "tabular inline-flex h-5 items-center gap-0.5 rounded-[5px] px-1.5 text-[11.5px] font-medium",
              flat ? "bg-neutral/12 text-muted" : good ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
            )}
            aria-label={`${formatDelta(delta)} versus previous ${range}`}
          >
            <Arrow className="size-3" strokeWidth={2} aria-hidden />
            {formatDelta(delta)}
          </span>
        )}
      </div>
      <div className="tabular truncate text-[22px] font-semibold leading-none tracking-[-0.02em] text-fg sm:text-[28px]" title={formatValue(kpi.value, kpi.format)}>
        {display(animated, kpi.format)}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="tabular min-w-0 truncate text-[11.5px] text-dim">
          vs {display(kpi.previous, kpi.format)} · prev {range}
        </span>
        <Sparkline data={kpi.spark} width={64} height={22} className={cn("hidden shrink-0 sm:block", selected ? "text-accent" : "text-muted group-hover:text-accent")} />
      </div>
    </Comp>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 rounded-[10px] border border-border bg-surface p-3 sm:p-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-7 w-32" />
      <div className="flex items-end justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-[22px] w-16" />
      </div>
    </div>
  );
}
