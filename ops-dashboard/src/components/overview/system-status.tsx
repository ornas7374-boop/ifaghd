"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import type { Integration, IntegrationStatus, StatusTone } from "@/lib/data/types";
import { cn, timeAgo } from "@/lib/format";

const TONE: Record<IntegrationStatus, StatusTone> = { operational: "success", syncing: "info", degraded: "warning", down: "danger" };

export function SystemStatus({ items, loading, now }: { items?: Integration[]; loading: boolean; now: number | null }) {
  const issues = items?.filter((i) => i.status === "degraded" || i.status === "down").length ?? 0;
  return (
    <Card>
      <CardHeader
        title="Systems"
        actions={
          !loading && (
            <span className={cn("flex items-center gap-1.5 text-[11.5px]", issues ? "text-warning" : "text-success")}>
              <StatusDot tone={issues ? "warning" : "success"} />
              {issues ? `${issues} degraded` : "All operational"}
            </span>
          )
        }
      />
      <ul className="py-1">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex h-9 items-center gap-3 px-4">
                <Skeleton className="size-2 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-12" />
              </li>
            ))
          : items?.map((s) => (
              <li key={s.id} className="flex h-9 items-center gap-3 px-4" title={`Last sync ${now ? timeAgo(s.lastSyncAt, now) : ""}`}>
                <StatusDot tone={TONE[s.status]} pulse={s.status === "syncing"} label={s.status} />
                <span className="min-w-0 flex-1 truncate text-[12.5px]">
                  {s.name} <span className="text-dim">· {s.category}</span>
                </span>
                <span className={cn("tabular font-mono text-[11.5px]", s.latencyMs > 1000 ? "text-warning" : "text-dim")}>{s.latencyMs.toLocaleString("en-US")}ms</span>
              </li>
            ))}
      </ul>
    </Card>
  );
}
