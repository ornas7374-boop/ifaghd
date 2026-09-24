/**
 * Deterministic mock data for "Bayt Coffee" — a Saudi specialty-coffee store
 * running on Relay. Everything is generated from a seeded PRNG anchored to the
 * current hour, so data is stable across reloads but always "recent".
 *
 * Replace with real sources in `api.ts` — nothing else imports this file.
 */
import type {
  Activity,
  AttentionItem,
  Channel,
  Customer,
  Integration,
  Order,
  OrderLine,
  OrderStatus,
  PaymentMethod,
  SeriesPoint,
  Workflow,
} from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Noura", "Faisal", "Reem", "Abdullah", "Lama", "Khalid", "Sara", "Turki", "Hessa", "Majed",
  "Dana", "Yousef", "Joud", "Nawaf", "Shahad", "Omar", "Rana", "Saud", "Layan", "Hamad",
  "Maha", "Bader", "Alanoud", "Rakan", "Ghada", "Ziyad", "Ruba", "Mishal", "Haya", "Sultan",
];
const LAST = [
  "Al-Qahtani", "Al-Harbi", "Al-Otaibi", "Al-Dosari", "Al-Shehri", "Al-Ghamdi", "Al-Zahrani",
  "Al-Mutairi", "Al-Anazi", "Al-Shammari", "Al-Subaie", "Al-Malki", "Al-Rashid", "Al-Juhani",
];
const CITIES = ["Riyadh", "Jeddah", "Dammam", "Khobar", "Makkah", "Madinah", "Abha", "Taif", "Tabuk", "Buraidah"];

export const PRODUCTS: { sku: string; name: string; price: number; stock: number }[] = [
  { sku: "ETH-YRG-250", name: "Ethiopia Yirgacheffe · 250g", price: 89, stock: 142 },
  { sku: "COL-HUI-1K", name: "Colombia Huila · 1kg", price: 245, stock: 38 },
  { sku: "KEN-AA-250", name: "Kenya AA Nyeri · 250g", price: 95, stock: 6 },
  { sku: "V60-02-CER", name: "Hario V60 02 Ceramic", price: 115, stock: 64 },
  { sku: "KTL-GN-900", name: "Gooseneck Kettle 900ml", price: 289, stock: 21 },
  { sku: "CBK-1L", name: "Cold Brew Kit · 1L", price: 159, stock: 4 },
  { sku: "FLT-100", name: "Paper Filters · 100 pack", price: 29, stock: 520 },
  { sku: "GRD-MAN-C2", name: "Manual Grinder C2", price: 399, stock: 17 },
  { sku: "CUP-SET-4", name: "Ceramic Cup Set · 4", price: 135, stock: 48 },
  { sku: "SUB-MONTH", name: "Monthly Roast Subscription", price: 179, stock: 999 },
];

const STATUSES: [OrderStatus, number][] = [
  ["fulfilled", 0.46],
  ["paid", 0.26],
  ["pending", 0.12],
  ["refunded", 0.05],
  ["cancelled", 0.05],
  ["failed", 0.06],
];
const PAYMENTS: [PaymentMethod, number][] = [
  ["Mada", 0.38],
  ["Apple Pay", 0.3],
  ["Visa", 0.14],
  ["Tabby", 0.12],
  ["Cash on delivery", 0.06],
];
const CHANNELS: [Channel, number][] = [
  ["Online store", 0.58],
  ["Instagram", 0.2],
  ["WhatsApp", 0.14],
  ["TikTok", 0.08],
];

function weighted<T>(rng: () => number, table: [T, number][]): T {
  let r = rng();
  for (const [v, w] of table) {
    if ((r -= w) <= 0) return v;
  }
  return table[table.length - 1][0];
}
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];

export interface Dataset {
  now: number;
  customers: Customer[];
  orders: Order[];
  workflows: Workflow[];
  daily: SeriesPoint[];
  hourly: SeriesPoint[];
  activity: Activity[];
  attention: AttentionItem[];
  integrations: Integration[];
}

let cache: { key: number; data: Dataset } | null = null;

export function getDataset(nowMs = Date.now()): Dataset {
  const anchor = Math.floor(nowMs / HOUR) * HOUR;
  if (cache?.key === anchor) return cache.data;
  const data = build(anchor, nowMs);
  cache = { key: anchor, data };
  return data;
}

function build(anchor: number, now: number): Dataset {
  const rng = mulberry32(20260924);

  // ---------- Customers ----------
  const customers: Customer[] = Array.from({ length: 64 }, (_, i) => {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    return {
      id: `cus_${(4100 + i * 7).toString(36)}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace("al-", "")}${i % 3 === 0 ? "" : Math.floor(rng() * 90 + 10)}@${pick(rng, ["gmail.com", "outlook.sa", "icloud.com", "hotmail.com"])}`,
      city: pick(rng, CITIES),
      orders: 0,
      lifetimeValue: 0,
      since: anchor - Math.floor(rng() * 540) * DAY,
    };
  });

  // ---------- Daily series (180 days, so "previous period" works for 90d) ----------
  const daily: SeriesPoint[] = [];
  const startOfToday = Math.floor(anchor / DAY) * DAY;
  for (let d = 179; d >= 0; d--) {
    const t = startOfToday - d * DAY;
    const dow = new Date(t).getUTCDay();
    // Thursday/Friday evenings are the weekend peak in KSA
    const weekend = dow === 4 || dow === 5 ? 1.28 : dow === 6 ? 1.1 : 1;
    const trend = 1 + (179 - d) * 0.0024; // steady growth
    const payday = new Date(t).getUTCDate() >= 25 || new Date(t).getUTCDate() <= 2 ? 1.18 : 1;
    const noise = 0.84 + rng() * 0.32;
    const visitors = Math.round(1850 * weekend * trend * noise);
    const cr = 0.021 + rng() * 0.009 + (payday - 1) * 0.02;
    const orders = Math.max(4, Math.round(visitors * cr * payday));
    const aov = 168 + rng() * 46;
    daily.push({ t, visitors, orders, revenue: Math.round(orders * aov) });
  }

  // ---------- Hourly series (48h) ----------
  const hourly: SeriesPoint[] = [];
  for (let h = 47; h >= 0; h--) {
    const t = anchor - h * HOUR;
    const hr = new Date(t).getUTCHours() + 3; // AST
    const local = hr % 24;
    const curve = local < 7 ? 0.25 : local < 12 ? 0.8 : local < 17 ? 1 : local < 23 ? 1.55 : 0.6;
    const noise = 0.8 + rng() * 0.4;
    const visitors = Math.round(95 * curve * noise);
    const orders = Math.max(0, Math.round(visitors * (0.02 + rng() * 0.012)));
    hourly.push({ t, visitors, orders, revenue: Math.round(orders * (160 + rng() * 60)) });
  }

  // ---------- Orders (last 30 days, most recent first) ----------
  const orders: Order[] = [];
  let seq = 10_482;
  let t = now - 4 * 60_000;
  while (t > now - 30 * DAY) {
    const customer = pick(rng, customers);
    const nLines = rng() < 0.6 ? 1 : rng() < 0.8 ? 2 : 3;
    const lines: OrderLine[] = [];
    for (let i = 0; i < nLines; i++) {
      const p = pick(rng, PRODUCTS);
      if (lines.some((l) => l.sku === p.sku)) continue;
      lines.push({ sku: p.sku, name: p.name, qty: rng() < 0.75 ? 1 : 2, price: p.price });
    }
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const shipping = subtotal > 200 ? 0 : 25;
    const ageH = (now - t) / HOUR;
    let status = weighted(rng, STATUSES);
    // Recent orders can't be fulfilled yet; old ones shouldn't still be pending
    if (ageH < 3 && status === "fulfilled") status = "paid";
    if (ageH > 72 && status === "pending") status = "fulfilled";
    const payment = weighted(rng, PAYMENTS);
    const order: Order = {
      id: `BC-${seq--}`,
      customer,
      total: Math.round((subtotal + shipping) * 1.15), // incl. 15% VAT
      status,
      payment,
      channel: weighted(rng, CHANNELS),
      createdAt: t,
      lines,
      shippingCarrier: pick(rng, ["SMSA", "Aramex", "SPL", "Redbox"] as const),
      events: [],
    };
    order.events = orderEvents(order).filter((e) => e.at <= now);
    customer.orders += 1;
    customer.lifetimeValue += order.total;
    orders.push(order);
    // Denser during recent days, ~50/day on average
    t -= (8 + rng() * 45) * 60_000;
  }

  // ---------- Workflows ----------
  const workflows: Workflow[] = [
    { id: "wf_abandoned_cart", name: "Abandoned cart recovery", trigger: "Cart idle 45 min", status: "active", lastRunAt: now - 6 * 60_000, successRate: 0.992, runs24h: 184, enabled: true },
    { id: "wf_whatsapp_confirm", name: "WhatsApp order confirmation", trigger: "Order paid", status: "running", lastRunAt: now - 40_000, successRate: 0.998, runs24h: 61, enabled: true },
    { id: "wf_invoice_zatca", name: "ZATCA e-invoice sync", trigger: "Order fulfilled", status: "failed", lastRunAt: now - 23 * 60_000, successRate: 0.912, runs24h: 48, enabled: true },
    { id: "wf_low_stock", name: "Low-stock reorder alert", trigger: "Stock < 10 units", status: "active", lastRunAt: now - 2.2 * HOUR, successRate: 1, runs24h: 3, enabled: true },
    { id: "wf_review_request", name: "Review request · day 5", trigger: "5 days after delivery", status: "active", lastRunAt: now - 51 * 60_000, successRate: 0.987, runs24h: 37, enabled: true },
    { id: "wf_ai_support", name: "AI support triage", trigger: "New WhatsApp message", status: "running", lastRunAt: now - 12_000, successRate: 0.964, runs24h: 212, enabled: true },
    { id: "wf_vip_tagging", name: "VIP customer tagging", trigger: "LTV > SAR 2,000", status: "paused", lastRunAt: now - 3.5 * DAY, successRate: 1, runs24h: 0, enabled: false },
  ];

  // ---------- Activity feed ----------
  const recent = orders.slice(0, 40);
  const activity: Activity[] = [];
  const mins = (m: number) => now - m * 60_000;
  activity.push(
    { id: "a1", kind: "order", actor: recent[0].customer.name, action: "placed order", target: recent[0].id, ref: { type: "order", id: recent[0].id }, at: recent[0].createdAt, tone: "success" },
    { id: "a2", kind: "workflow", actor: "AI support triage", action: "resolved 3 conversations", target: "WhatsApp", ref: { type: "workflow", id: "wf_ai_support" }, at: mins(9), tone: "info" },
    { id: "a3", kind: "order", actor: recent[2].customer.name, action: "placed order", target: recent[2].id, ref: { type: "order", id: recent[2].id }, at: recent[2].createdAt, tone: "success" },
    { id: "a4", kind: "workflow", actor: "ZATCA e-invoice sync", action: "failed on", target: recent[5].id, ref: { type: "workflow", id: "wf_invoice_zatca" }, at: mins(23), tone: "danger" },
    { id: "a5", kind: "refund", actor: "Lama Al-Shehri", action: "refunded", target: recent[8].id, ref: { type: "order", id: recent[8].id }, at: mins(41), tone: "warning" },
    { id: "a6", kind: "stock", actor: "Inventory", action: "flagged low stock for", target: "Cold Brew Kit · 1L", at: mins(58), tone: "warning" },
    { id: "a7", kind: "customer", actor: recent[11].customer.name, action: "joined the Monthly Roast plan", target: "", at: mins(74), tone: "info" },
    { id: "a8", kind: "team", actor: "Majed Al-Harbi", action: "fulfilled 14 orders via", target: "SMSA", at: mins(96), tone: "neutral" },
    { id: "a9", kind: "order", actor: recent[14].customer.name, action: "placed order", target: recent[14].id, ref: { type: "order", id: recent[14].id }, at: recent[14].createdAt, tone: "success" },
    { id: "a10", kind: "workflow", actor: "Abandoned cart recovery", action: "recovered", target: "SAR 1,284", ref: { type: "workflow", id: "wf_abandoned_cart" }, at: mins(150), tone: "success" },
  );
  activity.sort((a, b) => b.at - a.at);

  // ---------- Needs attention ----------
  const failedOrder = orders.find((o) => o.status === "failed")!;
  const refundOrder = orders.find((o) => o.status === "paid" && o.total > 300) ?? orders[3];
  const attention: AttentionItem[] = [
    { id: "n1", kind: "workflow_failed", title: "ZATCA e-invoice sync failed", detail: `3 invoices not submitted · last error 401 Unauthorized`, at: mins(23), actionLabel: "Retry", ref: { type: "workflow", id: "wf_invoice_zatca" } },
    { id: "n2", kind: "refund_request", title: `Refund request · ${refundOrder.id}`, detail: `${refundOrder.customer.name} · SAR ${refundOrder.total.toLocaleString("en-US")} · "Beans arrived damaged"`, at: mins(64), actionLabel: "Approve", ref: { type: "order", id: refundOrder.id } },
    { id: "n3", kind: "low_stock", title: "Cold Brew Kit · 1L — 4 left", detail: "Sells ~3/day · stockout in ~1 day", at: mins(58), actionLabel: "Reorder" },
    { id: "n4", kind: "payment_failed", title: `Payment failed · ${failedOrder.id}`, detail: `${failedOrder.customer.name} · ${failedOrder.payment} declined`, at: failedOrder.createdAt, actionLabel: "Send link", ref: { type: "order", id: failedOrder.id } },
    { id: "n5", kind: "low_stock", title: "Kenya AA Nyeri · 250g — 6 left", detail: "Sells ~2/day · stockout in ~3 days", at: mins(180), actionLabel: "Reorder" },
  ];

  // ---------- Integrations ----------
  const integrations: Integration[] = [
    { id: "salla", name: "Salla Store", category: "Storefront", status: "operational", latencyMs: 142, lastSyncAt: now - 30_000 },
    { id: "moyasar", name: "Moyasar Payments", category: "Payments", status: "operational", latencyMs: 188, lastSyncAt: now - 60_000 },
    { id: "n8n", name: "n8n Workers", category: "Automation", status: "syncing", latencyMs: 96, lastSyncAt: now - 8_000 },
    { id: "whatsapp", name: "WhatsApp Cloud API", category: "Messaging", status: "operational", latencyMs: 231, lastSyncAt: now - 45_000 },
    { id: "zatca", name: "ZATCA Fatoora", category: "E-invoicing", status: "degraded", latencyMs: 2140, lastSyncAt: now - 23 * 60_000 },
    { id: "smsa", name: "SMSA Express", category: "Shipping", status: "operational", latencyMs: 305, lastSyncAt: now - 4 * 60_000 },
  ];

  return { now, customers, orders, workflows, daily, hourly, activity, attention, integrations };
}

function orderEvents(o: Order): Order["events"] {
  const ev: Order["events"] = [{ at: o.createdAt, text: `Order placed via ${o.channel}`, tone: "neutral" }];
  const m = 60_000;
  if (o.status === "failed") {
    ev.push({ at: o.createdAt + 1 * m, text: `${o.payment} payment declined`, tone: "danger" });
    return ev.reverse();
  }
  if (o.status === "pending") {
    ev.push({ at: o.createdAt + 1 * m, text: "Awaiting payment confirmation", tone: "warning" });
    return ev.reverse();
  }
  ev.push({ at: o.createdAt + 1 * m, text: `Paid with ${o.payment}`, tone: "success" });
  ev.push({ at: o.createdAt + 2 * m, text: "WhatsApp confirmation sent", tone: "info" });
  if (o.status === "cancelled") ev.push({ at: o.createdAt + 90 * m, text: "Cancelled by customer", tone: "neutral" });
  if (o.status === "fulfilled" || o.status === "refunded") {
    ev.push({ at: o.createdAt + 6 * HOUR, text: `Shipped with ${o.shippingCarrier}`, tone: "info" });
    ev.push({ at: o.createdAt + 30 * HOUR, text: "Delivered", tone: "success" });
  }
  if (o.status === "refunded") ev.push({ at: o.createdAt + 50 * HOUR, text: "Refund issued", tone: "warning" });
  return ev.reverse();
}
