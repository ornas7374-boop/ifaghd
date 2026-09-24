"use client";

import { AlertOctagon, CheckCircle2, CreditCard, PackageMinus, Undo2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { runAction } from "@/lib/data/api";
import type { AttentionItem, AttentionKind } from "@/lib/data/types";
import { cn, timeAgo } from "@/lib/format";

const KIND: Record<AttentionKind, { icon: typeof AlertOctagon; tone: string; label: string }> = {
  workflow_failed: { icon: AlertOctagon, tone: "text-danger bg-danger/10", label: "Workflow failed" },
  payment_failed: { icon: CreditCard, tone: "text-danger bg-danger/10", label: "Payment failed" },
  refund_request: { icon: Undo2, tone: "text-warning bg-warning/10", label: "Refund request" },
  low_stock: { icon: PackageMinus, tone: "text-warning bg-warning/10", label: "Low stock" },
};

const DONE_MSG: Record<AttentionKind, string> = {
  workflow_failed: "Retry queued",
  payment_failed: "Payment link sent via WhatsApp",
  refund_request: "Refund approved",
  low_stock: "Reorder draft sent to supplier",
};

interface Props {
  items?: AttentionItem[];
  status: "loading" | "error" | "success";
  error?: string;
  onRetry: () => void;
  onOpen: (ref: NonNullable<AttentionItem["ref"]>) => void;
  now: number | null;
}

export function NeedsAttention({ items, status, error, onRetry, onOpen, now }: Props) {
  const toast = useToast();
  // Optimistic: resolved ids are hidden immediately; undo restores them.
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLUListElement>(null);
  const visible = (items ?? []).filter((i) => !resolved.has(i.id));

  const resolve = (item: AttentionItem, how: "action" | "dismiss") => {
    setResolved((s) => new Set(s).add(item.id));
    runAction(how === "action" ? item.actionLabel : "dismiss", item.id);
    toast({
      tone: how === "action" ? "success" : "info",
      title: how === "action" ? DONE_MSG[item.kind] : "Dismissed",
      description: item.title,
      onUndo: () =>
        setResolved((s) => {
          const n = new Set(s);
          n.delete(item.id);
          return n;
        }),
    });
  };

  // J/K (and arrows) move between rows; Enter opens the linked record.
  const onKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-row]") ?? []);
    const i = rows.indexOf(document.activeElement as HTMLElement);
    const down = e.key === "j" || e.key === "ArrowDown";
    const up = e.key === "k" || e.key === "ArrowUp";
    if ((down || up) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      const next = down ? Math.min(rows.length - 1, i + 1) : Math.max(0, i - 1);
      rows[next]?.focus();
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Needs attention
            {status === "success" && visible.length > 0 && <span className="tabular rounded-[4px] bg-hover px-1.5 text-[11.5px] text-muted">{visible.length}</span>}
          </span>
        }
        actions={
          <span className="hidden items-center gap-1.5 text-[11.5px] text-dim sm:flex">
            <Kbd keys={["J"]} />
            <Kbd keys={["K"]} /> to move
          </span>
        }
      />
      {status === "loading" && (
        <ul aria-busy="true" aria-label="Loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex h-[60px] items-center gap-3 border-b border-border px-4 last:border-0">
              <Skeleton className="size-7 rounded-[7px]" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="mt-1.5 h-3 w-1/2" />
              </div>
              <Skeleton className="h-7 w-16" />
            </li>
          ))}
        </ul>
      )}
      {status === "error" && (
        <div className="p-4">
          <ErrorState message={error ?? ""} onRetry={onRetry} />
        </div>
      )}
      {status === "success" && visible.length === 0 && (
        <EmptyState icon={CheckCircle2} title="All clear" body="Nothing needs you right now. Failed runs, refunds and low stock will show up here." className="flex-1" />
      )}
      {status === "success" && visible.length > 0 && (
        <ul ref={listRef} onKeyDown={onKeyDown} aria-label="Items needing attention">
          {visible.map((item) => {
            const k = KIND[item.kind];
            const Icon = k.icon;
            return (
              <li key={item.id} className="anim-fade border-b border-border last:border-0">
                <div
                  data-row
                  tabIndex={0}
                  role="button"
                  aria-label={`${k.label}: ${item.title}`}
                  onClick={() => item.ref && onOpen(item.ref)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && item.ref && e.target === e.currentTarget) onOpen(item.ref);
                  }}
                  className={cn(
                    "group flex min-h-[60px] items-center gap-3 px-4 py-2.5 outline-none transition-colors duration-100 hover:bg-hover/50 focus-visible:bg-hover/70 focus-visible:shadow-[inset_2px_0_0_var(--accent)]",
                    item.ref && "cursor-pointer",
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-[7px]", k.tone)}>
                    <Icon className="size-4" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-fg">{item.title}</p>
                    <p className="truncate text-[12px] text-muted">
                      {item.detail} <span className="text-dim">· {now ? timeAgo(item.at, now) : ""}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        resolve(item, "action");
                      }}
                    >
                      {item.actionLabel}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Dismiss ${item.title}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        resolve(item, "dismiss");
                      }}
                    >
                      <X strokeWidth={1.5} />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
