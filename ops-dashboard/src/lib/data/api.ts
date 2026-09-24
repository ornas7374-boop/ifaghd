/**
 * Data access layer — the ONLY place the UI gets data from.
 *
 * Every function here is async and shaped like a real API call. To go live,
 * replace the body of each function with a `fetch()` to your backend (see
 * README → "Plugging in the real API"); component code does not change.
 *
 * Demo switches (append to any URL):
 *   ?simulate=error  → every request fails, so you can see error states
 *   ?simulate=empty  → requests succeed with no records (empty states)
 *   ?simulate=slow   → 2.5s latency (skeletons)
 */
import { getDataset } from "./mock";
import { PRODUCTS } from "./mock";
import type { Kpi, Order, OverviewData, Range, SeriesPoint, TopProduct, Workflow } from "./types";

export type Simulate = "error" | "empty" | "slow" | null;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const RANGE_LABEL: Record<Range, string> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export class ApiError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

async function latency(simulate: Simulate, base = 380) {
  const ms = simulate === "slow" ? 2500 : base + Math.random() * 260;
  await new Promise((r) => setTimeout(r, ms));
  if (simulate === "error") throw new ApiError("Couldn't reach api.relay.app — request timed out after 10s", 504);
}

const sum = (pts: SeriesPoint[], k: keyof Omit<SeriesPoint, "t">) => pts.reduce((s, p) => s + p[k], 0);

/** Split a series into [current, previous] windows for the requested range. */
function windows(range: Range): { current: SeriesPoint[]; previous: SeriesPoint[] } {
  const ds = getDataset();
  if (range === "24h") return { current: ds.hourly.slice(-24), previous: ds.hourly.slice(-48, -24) };
  const n = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return { current: ds.daily.slice(-n), previous: ds.daily.slice(-2 * n, -n) };
}

/** Downsample sparklines to at most ~24 points so they stay crisp at 80px. */
function spark(pts: SeriesPoint[], f: (p: SeriesPoint) => number) {
  const step = Math.max(1, Math.floor(pts.length / 24));
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += step) {
    const chunk = pts.slice(i, i + step);
    out.push(chunk.reduce((s, p) => s + f(p), 0) / chunk.length);
  }
  return out;
}

export async function getOverview(range: Range, simulate: Simulate = null): Promise<OverviewData> {
  await latency(simulate);
  const ds = getDataset();
  const { current, previous } = windows(range);

  if (simulate === "empty") {
    const zero = current.map((p) => ({ ...p, revenue: 0, orders: 0, visitors: 0 }));
    return {
      range,
      topProducts: [],
      kpis: buildKpis(zero, zero, ds.workflows, range),
      series: zero,
      previousSeries: zero,
      activity: [],
      attention: [],
      integrations: ds.integrations,
    };
  }

  return {
    range,
    topProducts: topProducts(range),
    kpis: buildKpis(current, previous, ds.workflows, range),
    series: current,
    previousSeries: previous,
    activity: ds.activity,
    attention: ds.attention,
    integrations: ds.integrations,
  };
}

/** Best sellers by revenue from order lines in the window (order history covers 30 days). */
function topProducts(range: Range): TopProduct[] {
  const ds = getDataset();
  const since = ds.now - (range === "24h" ? DAY : range === "7d" ? 7 * DAY : 30 * DAY);
  const agg = new Map<string, TopProduct>();
  for (const o of ds.orders) {
    if (o.createdAt < since || o.status === "failed" || o.status === "cancelled") continue;
    for (const l of o.lines) {
      const p = PRODUCTS.find((x) => x.sku === l.sku)!;
      const row = agg.get(l.sku) ?? { sku: l.sku, name: l.name, units: 0, revenue: 0, stock: p.stock };
      row.units += l.qty;
      row.revenue += l.qty * l.price;
      agg.set(l.sku, row);
    }
  }
  return [...agg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}

function buildKpis(cur: SeriesPoint[], prev: SeriesPoint[], workflows: Workflow[], range: Range): Kpi[] {
  const rev = sum(cur, "revenue");
  const revP = sum(prev, "revenue");
  const ord = sum(cur, "orders");
  const ordP = sum(prev, "orders");
  const vis = sum(cur, "visitors");
  const visP = sum(prev, "visitors");
  const scale = range === "24h" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const runs = workflows.reduce((s, w) => s + w.runs24h, 0) * scale;
  const hasData = ord > 0;
  return [
    { id: "revenue", label: "Revenue", value: rev, previous: revP, format: "currency", spark: spark(cur, (p) => p.revenue), hint: "Gross sales incl. VAT" },
    { id: "orders", label: "Orders", value: ord, previous: ordP, format: "number", spark: spark(cur, (p) => p.orders), hint: "Paid + pending orders" },
    { id: "conversion", label: "Conversion rate", value: vis ? ord / vis : 0, previous: visP ? ordP / visP : 0, format: "percent", spark: spark(cur, (p) => (p.visitors ? p.orders / p.visitors : 0)), hint: "Orders ÷ storefront sessions" },
    { id: "aov", label: "Avg. order value", value: ord ? rev / ord : 0, previous: ordP ? revP / ordP : 0, format: "currency", spark: spark(cur, (p) => (p.orders ? p.revenue / p.orders : 0)), hint: "Revenue ÷ orders" },
    {
      id: "automation",
      label: "Automation runs",
      value: hasData ? Math.round(runs * 0.985) : 0,
      previous: hasData ? Math.round(runs * 0.9) : 0,
      format: "number",
      spark: spark(cur, (p) => p.orders * 3.4 + 20),
      hint: "Successful workflow executions",
    },
  ];
}

export async function getOrder(id: string, simulate: Simulate = null): Promise<Order> {
  await latency(simulate, 220);
  const order = getDataset().orders.find((o) => o.id === id);
  if (!order) throw new ApiError(`Order ${id} not found`, 404);
  return order;
}

export async function getWorkflow(id: string, simulate: Simulate = null): Promise<Workflow> {
  await latency(simulate, 220);
  const wf = getDataset().workflows.find((w) => w.id === id);
  if (!wf) throw new ApiError(`Workflow ${id} not found`, 404);
  return wf;
}

/** Mutations — resolve after a short delay; the UI updates optimistically before this returns. */
export async function runAction(action: string, id: string): Promise<{ ok: true; action: string; id: string }> {
  await new Promise((r) => setTimeout(r, 500));
  return { ok: true, action, id };
}

/** Synchronous, in-memory search index for the command palette. */
export function searchIndex() {
  const ds = getDataset();
  return {
    orders: ds.orders.slice(0, 300).map((o) => ({ id: o.id, title: `${o.id} · ${o.customer.name}`, subtitle: `SAR ${o.total.toLocaleString("en-US")} · ${o.status}`, status: o.status })),
    customers: ds.customers.map((c) => ({ id: c.id, title: c.name, subtitle: `${c.email} · ${c.city}` })),
    workflows: ds.workflows.map((w) => ({ id: w.id, title: w.name, subtitle: w.trigger, status: w.status })),
  };
}

export { DAY, HOUR };
