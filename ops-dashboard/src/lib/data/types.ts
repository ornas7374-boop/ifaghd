export type Range = "24h" | "7d" | "30d" | "90d";
export type Metric = "revenue" | "orders" | "visitors";

export type OrderStatus = "paid" | "pending" | "fulfilled" | "refunded" | "cancelled" | "failed";
export type PaymentMethod = "Mada" | "Apple Pay" | "Visa" | "Tabby" | "Cash on delivery";
export type Channel = "Online store" | "Instagram" | "WhatsApp" | "TikTok";

export interface Customer {
  id: string;
  name: string;
  email: string;
  city: string;
  orders: number;
  lifetimeValue: number;
  since: number;
}

export interface OrderLine {
  sku: string;
  name: string;
  qty: number;
  price: number;
}

export interface OrderEvent {
  at: number;
  text: string;
  tone: StatusTone;
}

export interface Order {
  id: string;
  customer: Customer;
  total: number;
  status: OrderStatus;
  payment: PaymentMethod;
  channel: Channel;
  createdAt: number;
  lines: OrderLine[];
  shippingCarrier: "SMSA" | "Aramex" | "SPL" | "Redbox";
  events: OrderEvent[];
}

export type WorkflowStatus = "active" | "running" | "failed" | "paused";

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  status: WorkflowStatus;
  lastRunAt: number;
  successRate: number;
  runs24h: number;
  enabled: boolean;
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type ActivityKind = "order" | "refund" | "workflow" | "customer" | "stock" | "team";

export interface Activity {
  id: string;
  kind: ActivityKind;
  actor: string;
  /** Short verb phrase — "placed order", "refunded" */
  action: string;
  target: string;
  /** Record reference for opening the detail panel */
  ref?: { type: "order" | "workflow"; id: string };
  at: number;
  tone: StatusTone;
}

export type AttentionKind = "workflow_failed" | "low_stock" | "refund_request" | "payment_failed";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  title: string;
  detail: string;
  at: number;
  actionLabel: string;
  ref?: { type: "order" | "workflow"; id: string };
}

export type IntegrationStatus = "operational" | "syncing" | "degraded" | "down";

export interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  latencyMs: number;
  lastSyncAt: number;
}

export interface SeriesPoint {
  t: number;
  revenue: number;
  orders: number;
  visitors: number;
}

export interface Kpi {
  id: "revenue" | "orders" | "conversion" | "aov" | "automation";
  label: string;
  value: number;
  previous: number;
  format: "currency" | "number" | "percent";
  /** When true, a decrease is the good direction (none of the defaults, but kept for reuse). */
  invert?: boolean;
  spark: number[];
  hint: string;
}

export interface TopProduct {
  sku: string;
  name: string;
  units: number;
  revenue: number;
  stock: number;
}

export interface OverviewData {
  range: Range;
  topProducts: TopProduct[];
  kpis: Kpi[];
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  activity: Activity[];
  attention: AttentionItem[];
  integrations: Integration[];
}
