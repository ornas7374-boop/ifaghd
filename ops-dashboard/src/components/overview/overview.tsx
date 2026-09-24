"use client";

import { Download, RefreshCw } from "lucide-react";
import { useCallback } from "react";
import { ActivityFeed } from "./activity-feed";
import { KpiCard, KpiCardSkeleton } from "./kpi-card";
import { MainChart, METRICS } from "./main-chart";
import { NeedsAttention } from "./needs-attention";
import { SystemStatus } from "./system-status";
import { TopProducts } from "./top-products";
import { useApp } from "@/components/shell/app-state";
import { RANGES } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { getOverview, RANGE_LABEL, type Simulate } from "@/lib/data/api";
import type { Metric, OverviewData, Range } from "@/lib/data/types";
import { cn, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks/use-now";
import { useQuery } from "@/lib/hooks/use-query";
import { useUrlParam, useUrlState } from "@/lib/hooks/use-url-state";
import { USER } from "@/components/shell/sidebar";

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function Overview() {
  const [range, setRange] = useUrlState<Range>("range", "30d", RANGES);
  const [metric, setMetric] = useUrlState<Metric>("metric", "revenue", METRICS.map((m) => m.value));
  const [simulate] = useUrlState<string>("simulate", "");
  const [, openParam] = useUrlParam("order");
  const { setCreateOpen } = useApp();
  const toast = useToast();
  const now = useNow();

  const sim = (simulate || null) as Simulate;
  const q = useQuery<OverviewData>(`overview:${range}:${sim}`, () => getOverview(range, sim));
  const data = q.data;
  // A failed first load = one banner + a frozen layout, not an error box in every card.
  const fatal = q.status === "error" && !data;
  const status = fatal ? "loading" : q.status;

  const open = useCallback(
    (ref: { type: "order" | "workflow"; id: string }) => {
      // Open one record at a time: set the chosen param, clear the other.
      if (ref.type === "order") openParam(ref.id, { workflow: null });
      else openParam(null, { workflow: ref.id });
    },
    [openParam],
  );

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{now ? `${greeting(now)}, ${USER.name.split(" ")[0]}` : " "}</h1>
          <p className="mt-1 text-[13px] text-muted">
            Here’s how Bayt Coffee is doing · <span className="text-fg">{RANGE_LABEL[range]}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("tabular hidden text-[12px] sm:inline", fatal ? "text-danger" : "text-dim")} aria-live="polite">
            {q.isFetching ? "Refreshing…" : fatal ? "Update failed" : now ? `Updated ${timeAgo(now - 20_000, now)}` : ""}
          </span>
          <Button variant="ghost" size="icon" onClick={q.retry} aria-label="Refresh data">
            <RefreshCw strokeWidth={1.5} className={cn(q.isFetching && "animate-spin motion-reduce:animate-none")} />
          </Button>
          <Button onClick={() => toast({ tone: "info", title: "Export started", description: `${RANGE_LABEL[range]} · CSV will be emailed to you` })}>
            <Download strokeWidth={1.5} /> Export
          </Button>
        </div>
      </header>

      {fatal && (
        <div className="mb-4">
          <ErrorState message={q.error!.message} onRetry={q.retry} />
        </div>
      )}

      <div className={cn(fatal && "frozen pointer-events-none opacity-50")} aria-hidden={fatal || undefined}>

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5 [&>*:first-child]:max-sm:col-span-2 [&>*:last-child]:sm:max-lg:col-span-2">
        {status === "loading" || !data
          ? Array.from({ length: 5 }).map((_, i) => <KpiCardSkeleton key={i} />)
          : data.kpis.map((k) => (
              <KpiCard
                key={k.id}
                kpi={k}
                range={range}
                selected={k.id === metric}
                onSelect={k.id === "revenue" || k.id === "orders" ? () => setMetric(k.id as Metric) : undefined}
              />
            ))}
      </section>

      <section aria-label="Trend" className="mt-4">
        <MainChart
          metric={metric}
          onMetric={setMetric}
          range={range}
          onRange={setRange}
          series={data?.series}
          previous={data?.previousSeries}
          status={data ? "success" : "loading"}
          error={q.error?.message}
          onRetry={q.retry}
        />
      </section>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <NeedsAttention items={data?.attention} status={data ? "success" : "loading"} onRetry={q.retry} onOpen={open} now={now} />
          <TopProducts items={data?.topProducts} loading={!data} range={range} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ActivityFeed items={data?.activity} status={data ? "success" : "loading"} onRetry={q.retry} onOpen={open} onCreate={() => setCreateOpen(true)} now={now} />
          <SystemStatus items={data?.integrations} loading={!data} now={now} />
        </div>
      </div>
      </div>
    </div>
  );
}
