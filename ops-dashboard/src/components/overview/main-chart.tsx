"use client";

import { LineChart as LineIcon } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import type { Metric, Range, SeriesPoint } from "@/lib/data/types";
import { cn, formatCurrency, formatDelta, formatNumber, pctChange } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/hooks/use-reduced-motion";

export const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "orders", label: "Orders" },
  { value: "visitors", label: "Visitors" },
];

const fmt = (m: Metric, v: number, compact = false) => (m === "revenue" ? formatCurrency(v, { compact }) : formatNumber(v, { compact }));

function tickLabel(t: number, range: Range) {
  const d = new Date(t);
  if (range === "24h") return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", "").toLowerCase();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const axisFmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

// Charts draw in once per session; switching range/metric updates instantly.
let hasDrawn = false;

interface Props {
  metric: Metric;
  onMetric: (m: Metric) => void;
  range: Range;
  onRange: (r: Range) => void;
  series?: SeriesPoint[];
  previous?: SeriesPoint[];
  status: "loading" | "error" | "success";
  error?: string;
  onRetry: () => void;
}

export function MainChart({ metric, onMetric, range, onRange, series, previous, status, error, onRetry }: Props) {
  const total = series?.reduce((s, p) => s + p[metric], 0) ?? 0;
  const prevTotal = previous?.reduce((s, p) => s + p[metric], 0) ?? 0;
  const delta = pctChange(total, prevTotal);
  const empty = status === "success" && total === 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 pt-3">
        <div role="tablist" aria-label="Chart metric" className="-mb-px flex gap-4">
          {METRICS.map((m) => (
            <button
              key={m.value}
              role="tab"
              type="button"
              aria-selected={metric === m.value}
              onClick={() => onMetric(m.value)}
              className={cn(
                "relative h-8 text-[13px] font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-px after:h-px after:transition-colors",
                metric === m.value ? "text-fg after:bg-fg" : "text-muted hover:text-fg after:bg-transparent",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Legend />
          <Segmented<Range>
            label="Chart time range"
            value={range}
            onChange={onRange}
            options={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
            ]}
          />
        </div>
      </div>

      <div className="px-4 pt-3">
        {status === "loading" ? (
          <>
            <Skeleton className="h-8 w-44" />
            <Skeleton className="mt-2 h-3.5 w-36" />
          </>
        ) : status === "success" ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tabular text-[22px] font-semibold sm:text-[28px] leading-none tracking-[-0.02em]">{fmt(metric, total)}</span>
            {delta !== null && (
              <span className={cn("tabular text-[12.5px] font-medium", delta >= 0 ? "text-success" : "text-danger")}>
                {formatDelta(delta)} <span className="font-normal text-dim">vs previous {range}</span>
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative h-[280px] px-1 pb-2 pt-4">
        {status === "loading" && <ChartSkeleton />}
        {status === "error" && (
          <div className="flex h-full items-center px-3">
            <div className="w-full">
              <ErrorState message={error ?? "Unknown error"} onRetry={onRetry} />
            </div>
          </div>
        )}
        {empty && (
          <EmptyState
            icon={LineIcon}
            title="No sales in this period"
            body="Once orders come in they’ll show up here, compared against the previous period."
            action={<Button size="sm">Copy store link</Button>}
            className="h-full py-0"
          />
        )}
        {status === "success" && !empty && series && previous && <Plot metric={metric} range={range} series={series} previous={previous} />}
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <div className="hidden items-center gap-3 text-[11.5px] text-muted sm:flex" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3 rounded-full bg-accent" /> This period
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="12" height="2">
          <line x1="0" y1="1" x2="12" y2="1" stroke="var(--chart-compare)" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
        Previous
      </span>
    </div>
  );
}

function ChartSkeleton() {
  // Mirrors the final chart: faint gridlines + axis tick placeholders
  return (
    <div className="flex h-full flex-col justify-between px-3 pb-6" aria-busy="true" aria-label="Loading chart">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-8" />
          <div className="h-px flex-1 bg-border" />
        </div>
      ))}
    </div>
  );
}

const Plot = memo(function Plot({ metric, range, series, previous }: { metric: Metric; range: Range; series: SeriesPoint[]; previous: SeriesPoint[] }) {
  const [animate, setAnimate] = useState(() => !hasDrawn && !prefersReducedMotion());
  useEffect(() => {
    hasDrawn = true;
    if (!animate) return;
    const id = setTimeout(() => setAnimate(false), 450);
    return () => clearTimeout(id);
  }, [animate]);

  const data = useMemo(() => series.map((p, i) => ({ t: p.t, cur: p[metric], prev: previous[i]?.[metric] ?? null, prevT: previous[i]?.t })), [series, previous, metric]);
  const interval = range === "24h" ? 3 : range === "7d" ? 0 : range === "30d" ? 4 : 14;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 4, right: 24, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="fill-cur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="t"
          tickFormatter={(t) => tickLabel(t, range)}
          interval={interval}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--text-dim)", fontSize: 11 }}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--text-dim)", fontSize: 11 }}
          tickFormatter={(v: number) => axisFmt.format(v)}
          tickCount={5}
        />
        <Tooltip
          content={<ChartTooltip metric={metric} range={range} />}
          cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="prev"
          stroke="var(--chart-compare)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          dot={false}
          activeDot={{ r: 3, fill: "var(--chart-compare)", stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={animate}
          animationDuration={400}
        />
        <Area
          type="monotone"
          dataKey="cur"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#fill-cur)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }}
          isAnimationActive={animate}
          animationDuration={400}
          animationEasing="ease-out"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

function ChartTooltip({ active, payload, metric, range }: TooltipProps<number, string> & { metric: Metric; range: Range }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as { t: number; cur: number; prev: number | null; prevT?: number };
  const d = row.prev ? pctChange(row.cur, row.prev) : null;
  const label = (t: number) =>
    range === "24h"
      ? new Date(t).toLocaleString("en-US", { weekday: "short", hour: "numeric", hour12: true })
      : new Date(t).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="min-w-[190px] rounded-[8px] border border-border-strong bg-surface-2 px-3 py-2 text-[12px] shadow-[var(--shadow-pop)]">
      <div className="mb-1.5 text-muted">{label(row.t)}</div>
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-2.5 rounded-full bg-accent" />
        <span className="flex-1 text-muted">This period</span>
        <span className="tabular font-medium text-fg">{fmt(metric, row.cur)}</span>
      </div>
      {row.prev !== null && row.prevT && (
        <div className="mt-1 flex items-center gap-2">
          <span className="h-0.5 w-2.5 rounded-full bg-[var(--chart-compare)]" />
          <span className="flex-1 text-muted">{label(row.prevT)}</span>
          <span className="tabular text-fg">{fmt(metric, row.prev)}</span>
        </div>
      )}
      {d !== null && (
        <div className={cn("tabular mt-1.5 border-t border-border pt-1.5 text-right font-medium", d >= 0 ? "text-success" : "text-danger")}>{formatDelta(d)}</div>
      )}
    </div>
  );
}
