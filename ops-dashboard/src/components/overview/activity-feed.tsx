"use client";

import { Boxes, Inbox, Package, RotateCcw, UserPlus, Users, Workflow } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatusDot } from "@/components/ui/status";
import type { Activity, ActivityKind } from "@/lib/data/types";
import { timeAgo } from "@/lib/format";

const SYSTEM_ICON: Partial<Record<ActivityKind, typeof Package>> = { workflow: Workflow, stock: Boxes };
const KIND_ICON: Record<ActivityKind, typeof Package> = { order: Package, refund: RotateCcw, workflow: Workflow, customer: UserPlus, stock: Boxes, team: Users };

interface Props {
  items?: Activity[];
  status: "loading" | "error" | "success";
  error?: string;
  onRetry: () => void;
  onOpen: (ref: NonNullable<Activity["ref"]>) => void;
  onCreate: () => void;
  now: number | null;
}

export function ActivityFeed({ items, status, error, onRetry, onOpen, onCreate, now }: Props) {
  return (
    <Card className="flex flex-col">
      <CardHeader title="Recent activity" actions={<span className="flex items-center gap-1.5 text-[11.5px] text-dim"><StatusDot tone="success" pulse /> Live</span>} />
      {status === "loading" && (
        <ul aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="flex h-10 items-center gap-3 px-4">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-10" />
            </li>
          ))}
        </ul>
      )}
      {status === "error" && (
        <div className="p-4">
          <ErrorState message={error ?? ""} onRetry={onRetry} compact />
        </div>
      )}
      {status === "success" && items?.length === 0 && (
        <EmptyState icon={Inbox} title="No activity yet" body="Orders, refunds and automation runs will stream in here as they happen." action={<Button size="sm" variant="primary" onClick={onCreate}>Create first order</Button>} />
      )}
      {status === "success" && !!items?.length && (
        <ul className="py-1">
          {items.slice(0, 8).map((a) => {
            const SysIcon = SYSTEM_ICON[a.kind];
            const KindIcon = KIND_ICON[a.kind];
            return (
              <li key={a.id}>
                <div className="group flex min-h-10 items-center gap-3 px-4 py-1.5">
                  <span className="relative">
                    {SysIcon ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-surface-2 ring-1 ring-border">
                        <SysIcon className="size-3 text-muted" strokeWidth={1.5} />
                      </span>
                    ) : (
                      <Avatar name={a.actor} size={20} />
                    )}
                    {!SysIcon && (
                      <span className="absolute -bottom-0.5 -right-1 flex size-3 items-center justify-center rounded-full bg-surface ring-1 ring-border">
                        <KindIcon className="size-2 text-muted" strokeWidth={2} />
                      </span>
                    )}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[12.5px] text-muted">
                    <span className="font-medium text-fg">{a.actor}</span> {a.action}{" "}
                    {a.target &&
                      (a.ref ? (
                        <button type="button" onClick={() => onOpen(a.ref!)} className="rounded-[4px] font-mono text-[12px] text-fg underline decoration-border-strong underline-offset-2 hover:decoration-accent">
                          {a.target}
                        </button>
                      ) : (
                        <span className="text-fg">{a.target}</span>
                      ))}
                  </p>
                  <StatusDot tone={a.tone} className="opacity-70" />
                  <time className="tabular min-w-12 shrink-0 whitespace-nowrap text-right text-[11.5px] text-dim" dateTime={new Date(a.at).toISOString()}>
                    {now ? timeAgo(a.at, now) : ""}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
