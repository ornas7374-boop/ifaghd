"use client";

import { Copy, ExternalLink, Play, RotateCcw, Truck } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/ui/side-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Badge, StatusDot } from "@/components/ui/status";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { getOrder, getWorkflow, runAction, type Simulate } from "@/lib/data/api";
import { getDataset } from "@/lib/data/mock";
import type { Order, OrderStatus, StatusTone, Workflow, WorkflowStatus } from "@/lib/data/types";
import { cn, formatCurrency, formatDateTime, formatPercent, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks/use-now";
import { useQuery } from "@/lib/hooks/use-query";
import { useUrlParam, useUrlState } from "@/lib/hooks/use-url-state";

export const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  paid: "info",
  pending: "warning",
  fulfilled: "success",
  refunded: "neutral",
  cancelled: "neutral",
  failed: "danger",
};
export const WORKFLOW_TONE: Record<WorkflowStatus, StatusTone> = { active: "success", running: "info", failed: "danger", paused: "neutral" };

/** Mounted once in the shell; any page can open a record via ?order= / ?workflow=. */
export function RecordPanels() {
  const [orderId, setOrder] = useUrlParam("order");
  const [workflowId, setWorkflow] = useUrlParam("workflow");
  const [simulate] = useUrlState<string>("simulate", "");
  const sim = (simulate || null) as Simulate;
  return (
    <>
      {orderId && <OrderPanel key={orderId} id={orderId} simulate={sim} onClose={() => setOrder(null)} />}
      {workflowId && !orderId && <WorkflowPanel key={workflowId} id={workflowId} simulate={sim} onClose={() => setWorkflow(null)} />}
    </>
  );
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="flex h-8 items-center text-[12.5px] text-muted">{label}</dt>
      <dd className="flex h-8 min-w-0 items-center gap-2 text-[13px] text-fg">{children}</dd>
    </>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[120px_1fr] gap-3">
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
      <Skeleton className="mt-4 h-28" />
      <Skeleton className="h-40" />
    </div>
  );
}

function OrderPanel({ id, simulate, onClose }: { id: string; simulate: Simulate; onClose: () => void }) {
  const q = useQuery(`order:${id}:${simulate}`, () => getOrder(id, simulate));
  const toast = useToast();
  const now = useNow();
  // Optimistic status override
  const [statusOverride, setStatusOverride] = useState<OrderStatus | null>(null);
  const order = q.data as Order | undefined;
  const status = statusOverride ?? order?.status;

  const changeStatus = (next: OrderStatus, verb: string) => {
    if (!order) return;
    const prev = status!;
    setStatusOverride(next);
    runAction(verb, order.id);
    toast({ tone: "success", title: `${order.id} ${verb}`, onUndo: () => setStatusOverride(prev) });
  };

  const others = order ? getDataset().orders.filter((o) => o.customer.id === order.customer.id && o.id !== order.id).slice(0, 3) : [];
  const subtotal = order?.lines.reduce((s, l) => s + l.qty * l.price, 0) ?? 0;

  return (
    <SidePanel
      open
      onClose={onClose}
      label={`Order ${id}`}
      header={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(id);
              toast({ tone: "info", title: "Order ID copied" });
            }}
            className="group flex items-center gap-1.5 rounded-[5px] px-1 font-mono text-[13px] font-medium hover:bg-hover"
            aria-label={`Copy order ID ${id}`}
          >
            {id}
            <Copy className="size-3 text-dim opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
          </button>
          {status && <Badge tone={ORDER_TONE[status]}>{status}</Badge>}
        </div>
      }
      footer={
        order && (
          <>
            <Button variant="danger" size="md" disabled={status === "refunded" || status === "failed"} onClick={() => changeStatus("refunded", "refunded")}>
              <RotateCcw strokeWidth={1.5} /> Refund
            </Button>
            <div className="flex-1" />
            <Button onClick={() => toast({ tone: "info", title: "Invoice PDF ready", description: "ZATCA-compliant · downloaded" })}>Invoice</Button>
            <Button variant="primary" disabled={status !== "paid"} onClick={() => changeStatus("fulfilled", "marked fulfilled")}>
              <Truck strokeWidth={1.5} /> Fulfill
            </Button>
          </>
        )
      }
    >
      {q.status === "loading" && <PanelSkeleton />}
      {q.status === "error" && (
        <div className="p-4">
          <ErrorState message={q.error.message} onRetry={q.retry} />
        </div>
      )}
      {order && (
        <div className="anim-fade">
          <dl className="grid grid-cols-[120px_1fr] px-4 py-3">
            <Property label="Customer">
              <Avatar name={order.customer.name} size={18} />
              <span className="truncate">{order.customer.name}</span>
            </Property>
            <Property label="Email">
              <span className="truncate text-muted">{order.customer.email}</span>
            </Property>
            <Property label="City">{order.customer.city}</Property>
            <Property label="Channel">{order.channel}</Property>
            <Property label="Payment">{order.payment}</Property>
            <Property label="Carrier">{order.shippingCarrier}</Property>
            <Property label="Placed">
              <span className="tabular">{formatDateTime(order.createdAt)}</span>
              <span className="text-dim">· {now ? timeAgo(order.createdAt, now) : ""}</span>
            </Property>
          </dl>

          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[12px] font-medium text-muted">Items</h3>
            <ul className="overflow-hidden rounded-[8px] border border-border">
              {order.lines.map((l) => (
                <li key={l.sku} className="flex h-10 items-center gap-3 border-b border-border px-3 last:border-0">
                  <span className="min-w-0 flex-1 truncate text-[13px]">{l.name}</span>
                  <span className="font-mono text-[11.5px] text-dim">{l.sku}</span>
                  <span className="tabular w-8 text-right text-[12.5px] text-muted">×{l.qty}</span>
                  <span className="tabular w-24 text-right text-[13px]">{formatCurrency(l.qty * l.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 flex flex-col gap-1 px-3 text-[12.5px]">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Shipping + VAT 15%</dt>
                <dd className="tabular">{formatCurrency(order.total - subtotal)}</dd>
              </div>
              <div className="flex justify-between font-medium text-fg">
                <dt>Total</dt>
                <dd className="tabular">{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-3 text-[12px] font-medium text-muted">Activity</h3>
            <ol className="relative flex flex-col gap-3 before:absolute before:bottom-2 before:left-[3.5px] before:top-2 before:w-px before:bg-border">
              {statusOverride && statusOverride !== order.status && (
                <li className="anim-fade relative flex items-start gap-3">
                  <StatusDot tone={ORDER_TONE[statusOverride]} className="mt-1.5" />
                  <span className="flex-1 text-[12.5px]">Marked {statusOverride} by Rayan</span>
                  <span className="text-[11.5px] text-dim">just now</span>
                </li>
              )}
              {order.events.map((ev, i) => (
                <li key={i} className="relative flex items-start gap-3">
                  <StatusDot tone={ev.tone} className="mt-1.5" />
                  <span className="flex-1 text-[12.5px] text-fg">{ev.text}</span>
                  <span className="tabular text-[11.5px] text-dim">{now ? timeAgo(ev.at, now) : ""}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[12px] font-medium text-muted">
              More from {order.customer.name.split(" ")[0]} · {order.customer.orders} orders · {formatCurrency(order.customer.lifetimeValue)} lifetime
            </h3>
            {others.length === 0 ? (
              <p className="text-[12.5px] text-dim">First order from this customer.</p>
            ) : (
              <ul className="flex flex-col">
                {others.map((o) => (
                  <li key={o.id} className="flex h-9 items-center gap-3 text-[12.5px]">
                    <StatusDot tone={ORDER_TONE[o.status]} />
                    <span className="font-mono text-muted">{o.id}</span>
                    <span className="flex-1 truncate text-dim">{o.lines[0]?.name}</span>
                    <span className="tabular">{formatCurrency(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </SidePanel>
  );
}

const LOGS = [
  ["INFO", "trigger received · order.fulfilled"],
  ["INFO", "building UBL 2.1 invoice (simplified tax invoice)"],
  ["WARN", "fatoora token expires in 0s — refreshing"],
  ["ERROR", "POST /invoices/reporting/single → 401 Unauthorized"],
  ["INFO", "retry scheduled with exponential backoff (2/5)"],
] as const;

function WorkflowPanel({ id, simulate, onClose }: { id: string; simulate: Simulate; onClose: () => void }) {
  const q = useQuery(`workflow:${id}:${simulate}`, () => getWorkflow(id, simulate));
  const toast = useToast();
  const now = useNow();
  const wf = q.data as Workflow | undefined;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const on = enabled ?? wf?.enabled ?? false;
  const status: WorkflowStatus | undefined = wf ? (on ? (wf.status === "paused" ? "active" : wf.status) : "paused") : undefined;

  return (
    <SidePanel
      open
      onClose={onClose}
      label={wf ? `Workflow ${wf.name}` : "Workflow"}
      header={
        <div className="flex min-w-0 items-center gap-2">
          {status && <StatusDot tone={WORKFLOW_TONE[status]} pulse={status === "running"} label={status} />}
          <span className="truncate text-[13.5px] font-medium">{wf?.name ?? "Loading…"}</span>
        </div>
      }
      footer={
        wf && (
          <>
            <Button onClick={() => toast({ tone: "info", title: "Opening in n8n…" })}>
              <ExternalLink strokeWidth={1.5} /> Open in n8n
            </Button>
            <div className="flex-1" />
            <Button variant="primary" disabled={!on} onClick={() => toast({ tone: "success", title: `${wf.name} queued`, description: "Manual run · started just now" })}>
              <Play strokeWidth={1.5} /> Run now
            </Button>
          </>
        )
      }
    >
      {q.status === "loading" && <PanelSkeleton />}
      {q.status === "error" && (
        <div className="p-4">
          <ErrorState message={q.error.message} onRetry={q.retry} />
        </div>
      )}
      {wf && status && (
        <div className="anim-fade">
          <dl className="grid grid-cols-[120px_1fr] px-4 py-3">
            <Property label="Enabled">
              <Toggle
                checked={on}
                label="Enable workflow"
                onChange={(v) => {
                  setEnabled(v);
                  runAction(v ? "enable" : "disable", wf.id);
                  toast({ tone: "success", title: `${wf.name} ${v ? "enabled" : "paused"}`, onUndo: () => setEnabled(!v) });
                }}
              />
            </Property>
            <Property label="Status">
              <Badge tone={WORKFLOW_TONE[status]}>{status}</Badge>
            </Property>
            <Property label="Trigger">{wf.trigger}</Property>
            <Property label="Last run">
              <span className="tabular">{now ? timeAgo(wf.lastRunAt, now) : ""}</span>
            </Property>
            <Property label="Runs · 24h">
              <span className="tabular">{wf.runs24h}</span>
            </Property>
            <Property label="Success rate">
              <span className="tabular w-14">{formatPercent(wf.successRate, 1)}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(wf.successRate * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Success rate">
                <span className={cn("block h-full rounded-full", wf.successRate > 0.97 ? "bg-success" : "bg-warning")} style={{ width: `${wf.successRate * 100}%` }} />
              </span>
            </Property>
          </dl>
          <section className="border-t border-border px-4 py-3">
            <h3 className="mb-2 text-[12px] font-medium text-muted">Latest run log</h3>
            <pre className="overflow-x-auto rounded-[8px] border border-border bg-bg p-3 font-mono text-[11.5px] leading-[1.7]">
              {(wf.status === "failed" ? LOGS : LOGS.filter((l) => l[0] === "INFO").slice(0, 2).concat([["INFO", "completed in 1.84s"]] as never)).map(([lvl, msg], i) => (
                <div key={i} className="flex gap-3 whitespace-pre">
                  <span className="text-dim">{new Date(wf.lastRunAt + i * 420).toISOString().slice(11, 23)}</span>
                  <span className={cn("w-11 shrink-0", lvl === "ERROR" ? "text-danger" : lvl === "WARN" ? "text-warning" : "text-info")}>{lvl}</span>
                  <span className="text-fg">{msg}</span>
                </div>
              ))}
            </pre>
            <p className="mt-2 text-[12px] text-dim">Full run history and live logs arrive with the Automations page.</p>
          </section>
        </div>
      )}
    </SidePanel>
  );
}
